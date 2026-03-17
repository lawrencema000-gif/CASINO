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

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  if (!isAdmin) return null;
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, amount, reason, notes } = body;

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

    // Fetch current balance
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("id, username, balance")
      .eq("id", userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const previousBalance = Number(targetUser.balance) || 0;
    const newBalance = previousBalance + adjustAmount;

    if (newBalance < 0) {
      return NextResponse.json(
        { error: "Adjustment would result in negative balance" },
        { status: 400 }
      );
    }

    // Update balance atomically
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

    // Record transaction
    const txType = adjustAmount > 0 ? "admin_credit" : "admin_debit";
    await supabaseAdmin.from("transactions").insert({
      player_id: userId,
      type: txType,
      amount: Math.abs(adjustAmount),
      balance_after: newBalance,
      description: `${reason || "Admin adjustment"}${notes ? ` - ${notes}` : ""}`,
    });

    // Log audit entry
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: admin.id,
      action: txType,
      target_type: "user",
      target_id: userId,
      details: {
        amount: adjustAmount,
        reason: reason || "Admin adjustment",
        notes: notes || null,
        previousBalance,
        newBalance,
        targetUsername: targetUser.username,
      },
    });

    return NextResponse.json({
      success: true,
      userId,
      username: targetUser.username,
      previousBalance,
      adjustment: adjustAmount,
      newBalance,
      reason: reason || "Admin adjustment",
    });
  } catch (error) {
    console.error("Wallet adjust error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: recent adjustments
export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("admin_audit_logs")
      .select("*")
      .in("action", ["admin_credit", "admin_debit"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Audit log query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch adjustments" },
        { status: 500 }
      );
    }

    return NextResponse.json({ adjustments: data || [] });
  } catch (error) {
    console.error("Wallet adjust GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
