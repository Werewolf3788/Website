import os
import json
from psnawp_api import PSNAWP

# BLOCKLIST: Games that will never show up on your site to protect account integrity
BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"]

def get_full_user_data(client_instance, name_label):
    """Helper to pull profile, trophy progress for top 5 games, and latest achievement."""
    try:
        # Get the authenticated 'me' user object (Required for PSNAWP 2.1.0+)
        me = client_instance.me()
        
        # Get presence (Online status / Current Game) and trophy summary
        presence = me.get_presence()
        trophy_summary = me.trophy_summary()
        
        # Extract presence info safely
        online_status = presence.get("primaryPlatformInfo", {}).get("onlineStatus")
        is_online = online_status == "online"
        
        game_list = presence.get("gameTitleInfoList", [])
        raw_game_name = game_list[0].get("titleName", "") if game_list else ""
        current_game_art = game_list[0].get("conceptIconUrl", "") if game_list else ""
        
        # Check if current game is blacklisted
        is_blacklisted = any(forbidden in raw_game_name.lower() for forbidden in BLACKLIST)
        current_game_name = "Dashboard" if (not raw_game_name or is_blacklisted) else raw_game_name
        
        # LOGGING for GitHub Actions Console troubleshooting
        print(f"--- {name_label} Sync ---")
        print(f"Level: {trophy_summary.trophy_level} ({trophy_summary.progress}%)")
        print(f"Status: {online_status}")
        print(f"Activity: {current_game_name}")
        
        recent_games = []
        latest_trophy_info = None

        # Get all trophy titles (games list)
        titles = me.trophy_titles()
        
        for title in titles:
            game_name = title.trophy_title_name
            
            # SMART FILTER: Skip blacklisted games entirely
            if any(forbidden in game_name.lower() for forbidden in BLACKLIST):
                continue
            
            # Limit to top 5 most recent valid games for the "Recent Hunts" grid
            if len(recent_games) < 5:
                recent_games.append({
                    "name": game_name,
                    "progress": title.progress, # The 0-100% progress
                    "art": title.trophy_title_icon_url,
                    "platform": title.np_communication_id 
                })
            
            # Get the single most recent earned trophy (Trophy Title + Icon)
            if not latest_trophy_info:
                try:
                    # Pass the account_id to check earned status
                    trophies = title.trophies(me.account_id)
                    for t in trophies:
                        if t.earned:
                            latest_trophy_info = {
                                "name": t.trophy_name,
                                "game": game_name,
                                "rank": t.trophy_type.name.capitalize(),
                                "icon": t.trophy_icon_url # Pulls actual trophy artwork
                            }
                            break
                except Exception as e:
                    print(f"Trophy detail skip for {game_name}: {e}")
            
            # Stop searching once we have 5 games and the latest trophy
            if len(recent_games) >= 5 and latest_trophy_info:
                break

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
            # Find the % progress for the current game from our filtered list
            "currentGameProgress": next((g['progress'] for g in recent_games if g['name'] == current_game_name), 0),
            "gameArt": current_game_art if current_game_name != "Dashboard" else "",
            "recentGames": recent_games
        }
    except Exception as e:
        print(f"Error fetching data for {name_label}: {e}")
        return None

def get_friend_status(client_instance, online_id):
    """Helper to check status of Lobby members (Ray/Darkwing)."""
    try:
        search_user = client_instance.user(online_id=online_id)
        presence = search_user.get_presence()
        game_list = presence.get("gameTitleInfoList", [])
        game = game_list[0].get("titleName", "") if game_list else ""
        
        # Apply blacklist to friends just in case
        if any(f in game.lower() for f in BLACKLIST): 
            game = "Classified"
        
        online_status = presence.get("primaryPlatformInfo", {}).get("onlineStatus")
        print(f"Lobby Member {online_id}: {online_status} {('- ' + game) if game else ''}")
        
        return {
            "online": online_status == "online",
            "currentGame": game
        }
    except Exception as e:
        print(f"Friend {online_id} not reachable: {e}")
        return {"online": False, "currentGame": ""}

def main():
    # Load Secrets from GitHub Actions Environment
    werewolf_token = os.getenv("PSN_NPSSO_WEREWOLF")
    ray_token = os.getenv("PSN_NPSSO_RAY")

    final_data = {"users": {}}

    # 1. Sync Werewolf Data
    if werewolf_token:
        try:
            client_w = PSNAWP(werewolf_token)
            data = get_full_user_data(client_w, "Werewolf")
            if data:
                final_data["users"]["werewolf"] = data
                # Use your session to check Darkwing's public presence
                final_data["users"]["darkwing"] = get_friend_status(client_w, "Darkwing69420")
        except Exception as e:
            print(f"Auth failed for Werewolf: {e}")

    # 2. Sync Ray Data (Full Profile)
    if ray_token:
        try:
            client_r = PSNAWP(ray_token)
            data = get_full_user_data(client_r, "Ray")
            if data:
                final_data["users"]["ray"] = data
        except Exception as e:
            print(f"Auth failed for Ray: {e}")

    # Ensure the target folder exists
    os.makedirs("Playstation", exist_ok=True)
    
    # Save formatted JSON for the website to read
    with open("Playstation/psn_data.json", "w") as f:
        json.dump(final_data, f, indent=2)
    
    print("Sync process finished. Playstation/psn_data.json updated.")

if __name__ == "__main__":
    main()
