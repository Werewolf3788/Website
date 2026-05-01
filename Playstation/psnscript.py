import os
import json
from psnawp_api import PSNAWP

# BLOCKLIST: Games that will never show up on your site
BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"]

def get_full_user_data(client, name_label):
    """Helper to pull profile, trophy progress for top 5 games, and latest achievement."""
    try:
        user = client.me()
        presence = user.get_presence()
        trophy_summary = user.trophy_summary()
        
        # Extract presence info safely
        online_status = presence.get("primaryPlatformInfo", {}).get("onlineStatus")
        is_online = online_status == "online"
        
        game_list = presence.get("gameTitleInfoList", [])
        current_game_name = game_list[0].get("titleName", "") if game_list else ""
        current_game_art = game_list[0].get("conceptIconUrl", "") if game_list else ""
        
        # LOGGING: See exactly what the script finds in GitHub Actions console
        print(f"--- {name_label} Stats ---")
        print(f"Level: {trophy_summary.trophy_level} ({trophy_summary.progress}%)")
        print(f"Status: {online_status}")
        if current_game_name:
            print(f"Activity: Playing {current_game_name}")
        
        recent_games = []
        latest_trophy_info = None

        # Get all trophy titles (games)
        titles = user.trophy_titles()
        
        for title in titles:
            game_name = title.trophy_title_name
            
            # SMART FILTER: Skip blacklisted games
            if any(forbidden in game_name.lower() for forbidden in BLACKLIST):
                continue
            
            # Limit to top 5 most recent valid games
            if len(recent_games) < 5:
                recent_games.append({
                    "name": game_name,
                    "progress": title.progress,
                    "art": title.trophy_title_icon_url,
                    "platform": title.np_communication_id 
                })
            
            # Get the single most recent earned trophy from the first valid game
            if not latest_trophy_info:
                try:
                    trophies = title.trophies(user.account_id)
                    for t in trophies:
                        if t.earned:
                            latest_trophy_info = {
                                "name": t.trophy_name,
                                "game": game_name,
                                "rank": t.trophy_type.name.capitalize(),
                                "icon": t.trophy_icon_url
                            }
                            break
                except:
                    pass
            
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
            "currentGame": current_game_name if not any(f in current_game_name.lower() for f in BLACKLIST) else "Dashboard",
            "currentGameProgress": next((g['progress'] for g in recent_games if g['name'] == current_game_name), 0),
            "gameArt": current_game_art if not any(f in current_game_name.lower() for f in BLACKLIST) else "",
            "recentGames": recent_games
        }
    except Exception as e:
        print(f"Error fetching data for {name_label}: {e}")
        return None

def get_friend_status(client, online_id):
    """Helper to check status of Ray and Darkwing."""
    try:
        search_user = client.user(online_id=online_id)
        presence = search_user.get_presence()
        game_list = presence.get("gameTitleInfoList", [])
        game = game_list[0].get("titleName", "") if game_list else ""
        
        if any(f in game.lower() for f in BLACKLIST): game = "Classified"
        
        online_status = presence.get("primaryPlatformInfo", {}).get("onlineStatus")
        print(f"Friend {online_id}: {online_status} {('- ' + game) if game else ''}")
        
        return {
            "online": online_status == "online",
            "currentGame": game
        }
    except Exception as e:
        print(f"Could not find friend {online_id}: {e}")
        return {"online": False, "currentGame": ""}

def main():
    werewolf_npsso = os.getenv("PSN_NPSSO_WEREWOLF")
    ray_npsso = os.getenv("PSN_NPSSO_RAY")

    final_data = {"users": {}}

    # 1. Werewolf
    if werewolf_npsso:
        try:
            client_w = PSNAWP(werewolf_npsso)
            data = get_full_user_data(client_w, "Werewolf")
            if data:
                final_data["users"]["werewolf"] = data
                # Use Werewolf's session to find Darkwing
                final_data["users"]["darkwing"] = get_friend_status(client_w, "Darkwing69420")
        except Exception as e:
            print(f"Login failed for Werewolf: {e}")

    # 2. Ray
    if ray_npsso:
        try:
            client_r = PSNAWP(ray_npsso)
            data = get_full_user_data(client_r, "Ray")
            if data:
                final_data["users"]["ray"] = data
        except Exception as e:
            print(f"Login failed for Ray: {e}")

    # Save
    os.makedirs("Playstation", exist_ok=True)
    with open("Playstation/psn_data.json", "w") as f:
        json.dump(final_data, f, indent=2)
    print("Successfully updated Playstation/psn_data.json")

if __name__ == "__main__":
    main()
