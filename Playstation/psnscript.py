import os
import json
from psnawp_api import PSNAWP

# BLOCKLIST: GTA titles are filtered out as requested
BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"]

def get_full_user_data(client_instance, name_label):
    """Helper to pull profile, trophy progress for top 5 games, and latest achievement."""
    try:
        # Step 1: Login and get the 'me' object
        me = client_instance.me()
        print(f"--- Starting Sync for {name_label} ---")
        
        # Step 2: Fetch basic summary and presence
        try:
            trophy_summary = me.trophy_summary()
            presence = me.get_presence()
        except Exception as e:
            print(f"Critical Error: Could not fetch basic profile info for {name_label}. Check Privacy Settings. {e}")
            return None

        online_status = presence.get("primaryPlatformInfo", {}).get("onlineStatus")
        is_online = online_status == "online"
        
        game_list = presence.get("gameTitleInfoList", [])
        raw_game_name = game_list[0].get("titleName", "") if game_list else ""
        current_game_art = game_list[0].get("conceptIconUrl", "") if game_list else ""
        
        # GTA Filter
        is_blacklisted = any(forbidden in raw_game_name.lower() for forbidden in BLACKLIST)
        current_game_name = "Dashboard" if (not raw_game_name or is_blacklisted) else raw_game_name
        
        recent_games = []
        latest_trophy_info = None

        # Step 3: Fetch Games and Trophy Progress
        try:
            titles = me.trophy_titles()
            for title in titles:
                game_name = title.trophy_title_name
                if any(forbidden in game_name.lower() for forbidden in BLACKLIST):
                    continue
                
                if len(recent_games) < 5:
                    recent_games.append({
                        "name": game_name,
                        "progress": title.progress,
                        "art": title.trophy_title_icon_url,
                        "platform": title.np_communication_id 
                    })
                
                if not latest_trophy_info:
                    try:
                        # Passing account_id is required for some API versions
                        trophies = title.trophies(me.account_id)
                        for t in trophies:
                            if t.earned:
                                latest_trophy_info = {
                                    "name": t.trophy_name,
                                    "game": game_name,
                                    "rank": t.trophy_type.name.capitalize(),
                                    "icon": t.trophy_icon_url
                                }
                                break
                    except: pass
                
                if len(recent_games) >= 5 and latest_trophy_info:
                    break
        except Exception as e:
            print(f"Warning: Could not fetch detailed game list for {name_label}. {e}")

        # Final Log for GitHub Console
        print(f"Result: Level {trophy_summary.trophy_level} found with {len(recent_games)} games.")

        return {
            "level": trophy_summary.trophy_level,
            "progress": trophy_summary.progress,
            "trophies": {
                "platinum": trophy_summary.earned_trophies.platinum,
                "gold": trophy_summary.earned_trophies.gold,
                "silver": trophy_summary.earned_trophies.silver,
                "bronze": trophy_summary.earned_trophies.bronze
            },
            "recentTrophy": latest_trophy_info,
            "online": is_online,
            "currentGame": current_game_name,
            "currentGameProgress": next((g['progress'] for g in recent_games if g['name'] == current_game_name), 0),
            "gameArt": current_game_art if current_game_name != "Dashboard" else "",
            "recentGames": recent_games,
            "lastUpdated": __import__('datetime').datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        print(f"Fatal error in get_full_user_data for {name_label}: {e}")
        return None

def get_friend_status(client_instance, online_id):
    """Helper to check status of Lobby members."""
    try:
        search_user = client_instance.user(online_id=online_id)
        presence = search_user.get_presence()
        game_list = presence.get("gameTitleInfoList", [])
        game = game_list[0].get("titleName", "") if game_list else ""
        if any(f in game.lower() for f in BLACKLIST): game = "Classified"
        return {
            "online": presence.get("primaryPlatformInfo", {}).get("onlineStatus") == "online",
            "currentGame": game
        }
    except:
        return {"online": False, "currentGame": ""}

def main():
    werewolf_token = os.getenv("PSN_NPSSO_WEREWOLF")
    ray_token = os.getenv("PSN_NPSSO_RAY")
    final_data = {"users": {}}

    if werewolf_token:
        try:
            client_w = PSNAWP(werewolf_token)
            data = get_full_user_data(client_w, "Werewolf")
            if data:
                final_data["users"]["werewolf"] = data
                final_data["users"]["darkwing"] = get_friend_status(client_w, "Darkwing69420")
        except Exception as e:
            print(f"Login failed for Werewolf: {e}")

    if ray_token:
        try:
            client_r = PSNAWP(ray_token)
            data = get_full_user_data(client_r, "Ray")
            if data:
                final_data["users"]["ray"] = data
        except Exception as e:
            print(f"Login failed for Ray: {e}")

    os.makedirs("Playstation", exist_ok=True)
    with open("Playstation/psn_data.json", "w") as f:
        json.dump(final_data, f, indent=2)
    print("Sync process finished successfully.")

if __name__ == "__main__":
    main()
