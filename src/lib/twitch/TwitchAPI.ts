import { request } from "urllib";
const events = ["stream.online", "stream.offline"];

let delayDate: Date | null = null;

const getAccessToken = async (): Promise<string> => {
  if (
    !process.env.TWITCH_CLIENT_ID ||
    !process.env.TWITCH_CLIENT_SECRET ||
    typeof process.env.TWITCH_CLIENT_ID !== "string" ||
    typeof process.env.TWITCH_CLIENT_SECRET !== "string"
  ) {
    throw new Error("TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET not set in environment variables");
  }
  const response = await request("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    data: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID ?? "",
      client_secret: process.env.TWITCH_CLIENT_SECRET ?? "",
      grant_type: "client_credentials",
    }).toString(),
  });

  if (response.statusCode >= 300) {
    console.error("Error response from Twitch token endpoint:", response.data.toString());
    throw new Error("Failed to fetch Twitch access token");
  }

  return JSON.parse(response.data.toString()).access_token;
};

const createSubscriptions = async (): Promise<void> => {
  const accessToken = await getAccessToken();
  for (const event of events) {
    const response = await request("https://api.twitch.tv/helix/eventsub/subscriptions", {
      method: "POST",
      data: {
        type: event,
        version: "1",
        condition: {
          broadcaster_user_id: process.env.TWITCH_BROADCASTER_ID, // Replace with actual broadcaster user ID
        },
        transport: {
          method: "webhook",
          callback: process.env.REDIRECT_TWITCH_URI,
          secret: process.env.TWITCH_EVENTSUB_SECRET,
        },
      },
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.statusCode >= 300) {
      console.error(`Error creating subscription for event ${event}:`, response.data.toString());
    } else {
      console.log(`Successfully created subscription for event ${event}:`, response.data.toString());
    }
  }
};

const verifyIfSubscriptionsExist = async (): Promise<boolean> => {
  const accessToken = await getAccessToken();
  const response = await request("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "GET",
    headers: {
      "Client-ID": process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.statusCode >= 300) {
    console.error("Error fetching subscriptions:", response.data.toString());
    throw new Error("Failed to fetch Twitch subscriptions");
  }

  // check if all events are subscribed to the right broadcaster and the right callback url and status is enabled
  const subscriptions = JSON.parse(response.data.toString()).data;
  console.log(subscriptions);
  for (const event of events) {
    const subscription = subscriptions.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub: any) =>
        sub.type === event &&
        sub.condition.broadcaster_user_id === process.env.TWITCH_BROADCASTER_ID &&
        sub.transport.callback === process.env.REDIRECT_TWITCH_URI &&
        sub.status === "enabled",
    );
    if (!subscription) {
      return false;
    }
  }
  return true;
};

export const twitchCheckScheduler = async (): Promise<void> => {
  // launch the check every 6 hours and automatically at startup
  await (async (): Promise<void> => {
    try {
      const allExist = await verifyIfSubscriptionsExist();
      if (!allExist) {
        console.log("One or more subscriptions are missing or disabled. Creating subscriptions...");
        await createSubscriptions();
      } else {
        console.log("All subscriptions are active and correct.");
      }
    } catch (error) {
      console.error("Error during Twitch subscription check:", error);
    }
  })();
  setInterval(
    async () => {
      try {
        const allExist = await verifyIfSubscriptionsExist();
        if (!allExist) {
          console.log("One or more subscriptions are missing or disabled. Creating subscriptions...");
          await createSubscriptions();
        } else {
          console.log("All subscriptions are active and correct.");
        }
      } catch (error) {
        console.error("Error during Twitch subscription check:", error);
      }
    },
    24 * 60 * 60 * 1000,
  ); // 24 hours in milliseconds
};

export const isDelayExceedStreamOnline = (): boolean => {
  if (!delayDate) {
    delayDate = new Date();
    return true;
  }
  const diff = new Date().getTime() - delayDate.getTime();
  // if diff is more than 10 minutes
  if (diff > 10 * 60 * 1000) {
    return true;
  }
  return false;
};

export const setDelayDateStreamOffline = (): void => {
  delayDate = new Date();
};
