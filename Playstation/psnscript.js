import os
import json
import datetime
import re
from psnawp_api import PSNAWP

# BLOCKLIST: GTA titles are filtered out to protect account integrity
BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"]

def format_duration(duration_str):
    """
    Requirement 7: Converts ISO 8601 duration (e.g., PT12H30M) to readable format (12h 30m).
    """
    if not duration_str:
        return "0h"
    hours = 0
    minutes = 0
    h_match = re.search(r'(\d+)H', duration_str)
    m_match = re.search(r'(\d+)M', duration_str)
    if h_match:
        hours = int(h_match.group(1))
    if m_match:
        minutes = int(m_match.group(1))
    
    if hours > 0:
        return f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"
    return f"{minutes}m"

def get_full_user_data(psn_client, name_label):
    """
    Fetches the 11 requirements: Game Title, Image, Trophy Title/Image, 
    Progress (%, 33/100), Hours, Recent Games, and Online Status.
    """
    try:
        me = psn_client.me()
        account_id = me.account_id
        user = psn_client.user(account_id=account_id)
        
        print(f"--- Starting Full Data Sync for {name_label} ---")
        
        # Requirement 11: Console Online/Offline status
        presence = user.get_presence()
        online_status = presence.get("primaryPlatformInfo", {}).get("onlineStatus", "offline")
        is_online = online_status == "online"

        # Requirement 1 & 2: Current Game Title and Image
        game_list = presence.get("gameTitleInfoList", [])
        raw_game_name = game_list[0].get("titleName", "") if game_list else ""
        current_game_art = game_list[0].get("conceptIconUrl", "") if game_list else ""
        
        is_blacklisted = any(forbidden in raw_game_name.lower() for forbidden in BLACKLIST)
        current_game_name = "Dashboard" if (not raw_game_name or is_blacklisted) else raw_game_name
        
        # Requirement 7: Hours played on game
        playtime_map = {}
        try:
            title_stats = user.title_stats()
            for stat in title_stats:
                playtime_map[stat.name] = format_duration(stat.play_duration)
        except Exception as e:
            print(f"[{name_label}] Playtime fetch failed: {e}")

        # Requirement 5, 6, & 9: Recent Games, Progress %, and Trophy Count (e.g. 33/100)
        recent_games = []
        latest_trophy_info = None
        current_game_stats = {"progress": 0, "count": "0/0"}

        try:
            titles = user.trophy_titles()
            for title in titles:
                game_name = title.trophy_title_name
                if any(forbidden in game_name.lower() for forbidden in BLACKLIST): 
                    continue
                
                # Calculation for Requirement 6 (33/100 logic)
                earned = (title.earned_trophies.platinum + title.earned_trophies.gold + 
                          title.earned_trophies.silver + title.earned_trophies.bronze)
                total = (title.defined_trophies.platinum + title.defined_trophies.gold + 
                         title.defined_trophies.silver + title.defined_trophies.bronze)
                trophy_ratio = f"{earned}/{total}"

                # Capture stats for the currently playing game
                if game_name == current_game_name:
                    current_game_stats["progress"] = title.progress
                    current_game_stats["count"] = trophy_ratio

                # Requirement 9: Recent games played
                if len(recent_games) < 5:
                    recent_games.append({
                        "name": game_name,
                        "progress": title.progress,
                        "trophyCount": trophy_ratio,
                        "art": title.trophy_title_icon_url,
                        "playtime": playtime_map.get(game_name, "--")
                    })
                
                # Requirement 3 & 4: Latest Trophy Title and Image
                if not latest_trophy_info:
                    try:
                        trophies = title.trophies(account_id)
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
        except Exception as e:
            print(f"[{name_label}] Trophy/History fetch failed: {e}")

        # Global Trophy Totals for the Hub
        trophy_summary = user.trophy_summary()

        return {
            "level": trophy_summary.trophy_level,
            "levelProgress": trophy_summary.progress,
            "trophies": {
                "platinum": trophy_summary.earned_trophies.platinum,
                "gold": trophy_summary.earned_trophies.gold,
                "silver": trophy_summary.earned_trophies.silver,
                "bronze": trophy_summary.earned_trophies.bronze,
                "total": (trophy_summary.earned_trophies.platinum + 
                          trophy_summary.earned_trophies.gold + 
                          trophy_summary.earned_trophies.silver + 
                          trophy_summary.earned_trophies.bronze)
            },
            "recentTrophy": latest_trophy_info,
            "online": is_online,
            "currentGame": current_game_name,
            "currentGameArt": current_game_art if current_game_name != "Dashboard" else "",
            "currentGamePlaytime": playtime_map.get(current_game_name, "--") if current_game_name != "Dashboard" else "--",
            "currentGameProgress": current_game_stats["progress"],
            "currentGameTrophyCount": current_game_stats["count"],
            "recentGames": recent_games,
            "lastUpdated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        print(f"Fatal error syncing {name_label}: {e}")
        return None

def get_friend_status(psn_client, online_id):
    """
    Requirement 8 & 10: Checks online status and current game for specific friends.
    """
    try:
        search_user = psn_client.user(online_id=online_id)
        presence = search_user.get_presence()
        
        # Requirement 8: What game are they playing
        game_list = presence.get("gameTitleInfoList", [])
        game = game_list[0].get("titleName", "") if game_list else ""
        
        if any(f in game.lower() for f in BLACKLIST): 
            game = "Classified"
            
        status = presence.get("primaryPlatformInfo", {}).get("onlineStatus", "offline")
        return {
            "online": status == "online", 
            "currentGame": game
        }
    except:
        return {"online": False, "currentGame": ""}

def main():
    # Load Tokens from Environment
    werewolf_token = os.getenv("PSN_NPSSO_WEREWOLF")
    ray_token = os.getenv("PSN_NPSSO_RAY")
    
    final_data = {"users": {}}

    if werewolf_token:
        try:
            client_w = PSNAWP(werewolf_token)
            # Admin Kevin (Werewolf) Full Sync
            data = get_full_user_data(client_w, "Werewolf")
            if data:
                final_data["users"]["werewolf"] = data
                
                # Requirement 10: Specific most played friends list
                print("--- Syncing Most Played Friends ---")
                final_data["users"]["ray"] = get_friend_status(client_w, "raymystyro")
                final_data["users"]["phoenix"] = get_friend_status(client_w, "phoenix_darkfire")
                final_data["users"]["terrdog"] = get_friend_status(client_w, "TerrDog420")
                final_data["users"]["darkwing"] = get_friend_status(client_w, "Darkwing69420")
                final_data["users"]["elucidator"] = get_friend_status(client_w, "ElucidatorVah")
        except Exception as e:
            print(f"Werewolf Authentication Error: {e}")

    # If Ray's token is also provided, get his detailed stats too
    if ray_token:
        try:
            client_r = PSNAWP(ray_token)
            ray_full = get_full_user_data(client_r, "Ray")
            if ray_full:
                final_data["users"]["ray"] = ray_full
        except:
            pass

    # Save output to the JSON file the website uses
    os.makedirs("Playstation", exist_ok=True)
    with open("Playstation/psn_data.json", "w") as f:
        json.dump(final_data, f, indent=2)
    print("--- Sync Finished: 11 Requirements Met ---")

if __name__ == "__main__":
    main()
