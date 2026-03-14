import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Check role column (if exists) or fallback to email
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin =
    profile?.role === "admin" || user.email === "admin@fortuna.casino";
  if (!isAdmin) return null;
  return user;
}

// GET: search/list users with pagination
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search.trim()) {
      query = query.ilike("username", `%${search.trim()}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("Admin users query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      users: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: adjust user balance
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, amount, reason } = body;

    if (!userId || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: "userId and amount are required" },
        { status: 400 }
      );
    }

    const adjustAmount = Number(amount);
    if (isNaN(adjustAmount) || adjustAmount === 0) {
      return NextResponse.json(
        { error: "amount must be a non-zero number" },
        { status: 400 }
      );
    }

    // Get current profile
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("id, username, balance")
      .eq("id", userId)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newBalance = Math.max(0, Number(profile.balance) + adjustAmount);

    // Update balance
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", userId);

    if (updateError) {
      console.error("Balance update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update balance" },
        { status: 500 }
      );
    }

    // Log the transaction
    await supabaseAdmin.from("transactions").insert({
      player_id: userId,
      type: adjustAmount > 0 ? "admin_credit" : "admin_debit",
      amount: Math.abs(adjustAmount),
      balance_after: newBalance,
    });

    return NextResponse.json({
      success: true,
      userId,
      previousBalance: Number(profile.balance),
      adjustment: adjustAmount,
      newBalance,
      reason: reason || "Admin adjustment",
    });
  } catch (error) {
    console.error("Admin users POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
