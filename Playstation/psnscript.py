import os
import json
from psnawp_api import PSNAWP

# BLOCKLIST: Games that will never show up on your site
BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"]

def get_full_user_data(client):
    """Helper to pull profile, trophy progress for top 5 games, and latest achievement."""
    user = client.me()
    presence = user.get_presence()
    trophy_summary = user.trophy_summary()
    
    is_online = presence.get("primaryPlatformInfo", {}).get("onlineStatus") == "online"
    current_game_name = presence.get("gameTitleInfoList", [{}])[0].get("titleName", "")
    current_game_art = presence.get("gameTitleInfoList", [{}])[0].get("conceptIconUrl", "")
    
    recent_games = []
    latest_trophy_info = None

    try:
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
                    "platform": title.np_communication_id # Used to help identify PS5/PS4
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
            
            # If we have 5 games and a trophy, we can stop searching
            if len(recent_games) >= 5 and latest_trophy_info:
                break

    except Exception as e:
        print(f"Error fetching detailed data: {e}")

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
        "gameArt": current_game_art if not any(f in current_game_name.lower() for f in BLACKLIST) else "",
        "recentGames": recent_games
    }

def get_friend_status(client, online_id):
    """Helper to check status of Ray and Darkwing."""
    try:
        search_user = client.user(online_id=online_id)
        presence = search_user.get_presence()
        game = presence.get("gameTitleInfoList", [{}])[0].get("titleName", "")
        # Apply blacklist to friends too, just in case
        if any(f in game.lower() for f in BLACKLIST): game = "Classified"
        
        return {
            "online": presence.get("primaryPlatformInfo", {}).get("onlineStatus") == "online",
            "currentGame": game
        }
    except:
        return {"online": False, "currentGame": ""}

def main():
    werewolf_npsso = os.getenv("PSN_NPSSO_WEREWOLF")
    ray_npsso = os.getenv("PSN_NPSSO_RAY")

    final_data = {"users": {}}

    if werewolf_npsso:
        try:
            client_w = PSNAWP(werewolf_npsso)
            final_data["users"]["werewolf"] = get_full_user_data(client_w)
            final_data["users"]["darkwing"] = get_friend_status(client_w, "Darkwing69420")
        except Exception as e:
            print(f"Error: {e}")

    if ray_npsso:
        try:
            client_r = PSNAWP(ray_npsso)
            final_data["users"]["ray"] = get_full_user_data(client_r)
        except Exception as e:
            print(f"Error: {e}")

    os.makedirs("json", exist_ok=True)
    with open("json/psn_data.json", "w") as f:
        json.dump(final_data, f, indent=2)

if __name__ == "__main__":
    main()
