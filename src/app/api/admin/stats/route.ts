import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // Auth check: verify the caller is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check: role column (if exists) or fallback to email
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isAdmin = adminProfile?.role === "admin" || adminProfile?.role === "super_admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch aggregate stats in parallel
    const [usersRes, gamesRes, profilesRes, recentGamesRes, recentSignupsRes] =
      await Promise.all([
        // Total users count
        supabaseAdmin
          .from("profiles")
          .select("*", { count: "exact", head: true }),

        // Total games count
        supabaseAdmin
          .from("games")
          .select("*", { count: "exact", head: true }),

        // Aggregate wagered/won from profiles
        supabaseAdmin
          .from("profiles")
          .select("total_wagered, total_won, games_played"),

        // Recent 20 games with player info
        supabaseAdmin
          .from("games")
          .select("id, player_id, game_type, bet_amount, payout, multiplier, settled, created_at")
          .order("created_at", { ascending: false })
          .limit(20),

        // Recent 10 signups
        supabaseAdmin
          .from("profiles")
          .select("id, username, balance, level, vip_tier, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    // Sum up totals from profiles
    const profiles = profilesRes.data || [];
    let totalWagered = 0;
    let totalWon = 0;
    let totalGamesPlayed = 0;

    for (const p of profiles) {
      totalWagered += Number(p.total_wagered) || 0;
      totalWon += Number(p.total_won) || 0;
      totalGamesPlayed += Number(p.games_played) || 0;
    }

    // Enrich recent games with usernames
    const recentGames = recentGamesRes.data || [];
    const playerIds = [...new Set(recentGames.map((g) => g.player_id))];

    let playerMap: Record<string, string> = {};
    if (playerIds.length > 0) {
      const { data: players } = await supabaseAdmin
        .from("profiles")
        .select("id, username")
        .in("id", playerIds);

      if (players) {
        for (const p of players) {
          playerMap[p.id] = p.username;
        }
      }
    }

    const enrichedGames = recentGames.map((g) => ({
      ...g,
      player_username: playerMap[g.player_id] || "Unknown",
    }));

    return NextResponse.json({
      totalUsers: usersRes.count || 0,
      totalGamesPlayed,
      totalWagered,
      totalWon,
      houseProfit: totalWagered - totalWon,
      recentGames: enrichedGames,
      recentSignups: recentSignupsRes.data || [],
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
