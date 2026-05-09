import { AuthTokens, buildRequestUrl, call } from "../utils";

export interface GameTitleInfo {
  npTitleId: string;
  titleName: string;
  format: string;
  launchPlatform: string;
  npCommunicationId?: string;
  conceptIconUrl?: string;
  formatValue?: string;
}

export interface PrimaryPlatformInfo {
  onlineStatus: "online" | "offline" | "invisible";
  platform?: "PS4" | "PS5" | "cross";
  lastOnlineDate?: string;
}

export interface BasicPresence {
  availability: string;
  primaryPlatformInfo?: PrimaryPlatformInfo;
  gameTitleInfoList?: GameTitleInfo[];
}

export interface BasicPresenceResponse {
  basicPresences: BasicPresence[];
}

/**
 * A call to this function will retrieve the basic presence of a user.
 * This includes their online status, and what game they are currently playing.
 *
 * @param authorization An object containing your access token, typically retrieved with `exchangeCodeForAccessToken()`.
 * @param accountId The account ID of the user. (Note: Can be "me" if querying the authenticating account).
 */
export const getBasicPresence = async (
  authorization: AuthTokens,
  accountId: string
): Promise<BasicPresenceResponse> => {
  
  // Construct the official Sony API endpoint URL
  const url = buildRequestUrl(
    "userProfile",
    "/v1/internal/users/:accountId/basicPresences?type=primary",
    { accountId }
  );

  // Execute the fetch call using the provided authorization tokens
  return await call<BasicPresenceResponse>({ url }, authorization);
};
