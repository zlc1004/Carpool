# What you need to know about notifications

_Learn about notification types and their behavior before you get started._

Notifications are alerts that inform users of new information or events, even when the app isn't actively in use. They have a large surface area and differences across platforms can make implementing notifications intimidating.

Whether you are starting with notifications or have existing knowledge, this document explains the different types of notification and their behaviors.

Expo's notification support builds on top of the native functionality provided by Android and iOS. The same concepts and behaviors from native platforms apply to Expo apps. If you are unsure about a specific notification feature, see each platform's [official documentation](#external-references).

## Remote and Local notifications

1. **Push Notifications**: (also known as "remote notifications") Notifications that are sent to a user's device from a remote server.
2. **Local Notifications**: (also known as "in-app notifications") Notifications that are created and displayed from within the app. Since many of the APIs that create these notifications will create them at a particular time, these may also sometimes be called "scheduled notifications".

`expo-notifications` supports both push and local notifications. You must use a [development build](https://docs.expo.dev/develop/development-builds/introduction/) to use push notifications since the capability is not built into Expo Go.

See [in-app notifications](https://docs.expo.dev/versions/latest/sdk/notifications/#present-a-local-in-app-notification-to-the-user) on how to create and display a local notification. The rest of this guide focuses on push notifications.

## Push Notification delivery

When a push notification arrives to your app, its behavior depends on the app's state and the type of notification. Let's clarify the terminology:

### Application states

- **Foreground**: The app is actively running in the foreground. Its interface is currently being displayed on the screen.
- **Background**: The app is running in the background, "minimized". Its interface is not currently being displayed on the screen.
- **Terminated**: The app was "killed", usually by a swipe-away gesture in the app switcher. On Android, if the user force-stops the app from device settings, it must be manually reopened for notifications to start working (this is a limitation of Android).

### Push Notification behaviors

For any kind of notification, when the app is in the foreground, the app is in control of how an incoming notification is handled. The app may present it directly, show some custom in-app UI, or even ignore it (this is controlled by [`NotificationHandler`](https://docs.expo.dev/versions/latest/sdk/notifications/#setnotificationhandlerhandler)). When the app is not in the foreground, the behavior depends on the type of notification.

The table below summarizes what happens when a push notification is delivered to the device:

| Notification Type                                                                                                                                                                                                       | App in Foreground                                                                                                                                                                                        | App in Background                                                                      | App Terminated                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [Notification Message](https://docs.expo.dev/push-notifications/what-you-need-to-know/#notification-message) and [Notification Message with data payload](https://docs.expo.dev/push-notifications/what-you-need-to-know/#notification-message-with-data-payload) | delivery runs [`NotificationReceivedListener`](https://docs.expo.dev/versions/latest/sdk/notifications/#addnotificationreceivedlistenerlistener) and [JS task](https://docs.expo.dev/versions/latest/sdk/notifications/#registertaskasynctaskname) | OS shows notification                                                                  | OS shows notification                                                                  |
| [Headless Background Notification](https://docs.expo.dev/push-notifications/what-you-need-to-know/#headless-background-notifications)                                                                                                        | delivery runs [`NotificationReceivedListener`](https://docs.expo.dev/versions/latest/sdk/notifications/#addnotificationreceivedlistenerlistener) and [JS task](https://docs.expo.dev/versions/latest/sdk/notifications/#registertaskasynctaskname) | delivery runs [JS task](https://docs.expo.dev/versions/latest/sdk/notifications/#registertaskasynctaskname) | delivery runs [JS task](https://docs.expo.dev/versions/latest/sdk/notifications/#registertaskasynctaskname) |

For the cases when the user interacts with the notification (for example, by pressing an action button), the following handlers are made available to you.

| App state  | iOS Listener(s) triggered              | Android Listener(s) triggered                                                                                       |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Foreground | `NotificationResponseReceivedListener` | `NotificationResponseReceivedListener`                                                                              |
| Background | `NotificationResponseReceivedListener` | `NotificationResponseReceivedListener` and [JS task](https://docs.expo.dev/versions/latest/sdk/notifications/#registertaskasynctaskname) |
| Terminated | `NotificationResponseReceivedListener` | [JS task](https://docs.expo.dev/versions/latest/sdk/notifications/#registertaskasynctaskname)                                            |

In the table above, whenever `NotificationResponseReceivedListener` is triggered, also `useLastNotificationResponse` return value would change.

> **info** When the app is not running or killed and is started by tapping on a notification, the `NotificationResponseReceivedListener` should be registered early (module top-level) to be triggered on iOS. For action buttons that bring the app to the foreground, we recommend to capture the response using `useLastNotificationResponse` or `getLastNotificationResponse` after the app starts.

## Push Notification types

### Notification Message

A Notification Message is a notification that specifies presentational information, such as a title or body text.

- On Android, this corresponds to a push notification request that contains [`AndroidNotification`](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#AndroidNotification)
- On iOS, this corresponds to a push notification request that contains [`aps.alert` dictionary](https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification#Create-the-JSON-payload) and the `apns-push-type` header set to `alert`.

When you use the Expo Push Service, and specify `title`, `subtitle`, `body`, `icon`, or `channelId`, the resulting push notification request is a Notification Message.

[//]: # 'TODO vonovak clarify what fields make a notification to be considered a Notification Message'

The typical use case for a Notification Message is to have it presented to the user immediately without any extra processing being done.

### Notification Message with data payload

This is an Android-only term ([see the official docs](https://firebase.google.com/docs/cloud-messaging/concept-options#data_messages)) where a push notification request contains both `data` field and a `notification` field.

On iOS, extra data may be part of a regular Notification Message request. Apple doesn't distinguish between Notification Message which does and does not carry data.

### Headless Background Notifications

Headless Notification is a remote notification that doesn't directly specify presentational information such as the title or body text. With the exception below\*, headless notifications are not presented to users. Instead, they carry data (JSON) which is processed by a JavaScript task defined in your app via [`registerTaskAsync`](https://docs.expo.dev/versions/latest/sdk/notifications/#registertaskasynctaskname). The task may perform arbitrary logic. For example, write to `AsyncStorage`, make an api request, or present a local notification whose content is taken from the push notification's data.

> **info** We use the term "Headless Background Notification" to refer to the [Data Message](https://firebase.google.com/docs/cloud-messaging/concept-options#data_messages) on Android and the [background notification](https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app#Create-a-background-notification) on iOS. Their key similarities are that both of these notification types allow sending only JSON data, and background processing by the app.

Headless Background Notifications have the ability to run custom JavaScript in response to a notification _even when the app is terminated_. This is powerful but comes with a limitation: even when the notification is delivered to the device, the OS does not guarantee its delivery to your app. This may happen due to a variety of reasons, such as when [Doze mode](https://developer.android.com/training/monitoring-device-state/doze-standby) is enabled on Android, or when you send too many background notifications &mdash; Apple recommends not to [send more than two or three per hour](https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app#overview).

When you use the Expo Push Service, and specify only `data` and `_contentAvailable: true` (and other non-interactive fields such as `ttl`), the resulting push notification request produces a Headless Background Notification.

[//]: # 'TODO vonovak clarify how setting priority behaves here, because apns-priority field should be 5 on iOS but can be specified on Android'

> To use Headless Background Notifications on iOS, you have to [configure](https://docs.expo.dev/versions/latest/sdk/notifications/#background-notification-configuration) them first.

The rule of thumb is to prefer a regular Notification Message if you don't require running JavaScript in the background.

\* The exception is when you specify `title` or `message` inside of [`data`](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#AndroidConfig). In that case, `expo-notifications` package automatically presents the headless notification on Android, but not on iOS. We plan to make this behavior more consistent across platforms in a future release.

### Data-only notifications

Android has a concept of [Data Messages](https://firebase.google.com/docs/cloud-messaging/concept-options#data_messages). iOS does not have exactly the same concept, but a close equivalent is [Headless Background Notifications](#headless-background-notifications).

You may also come across the term "silent notification", which is yet another name for notifications that don't present anything to the user &mdash; we describe these as [Headless Background Notifications](#headless-background-notifications).

## External references

This is a non-exhaustive list of official resources for push notifications on Android and iOS:

- [Android - About FCM messages](https://firebase.google.com/docs/cloud-messaging/concept-options)
- [iOS - Generating a remote notification](https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification)
- [iOS - Pushing background updates to your app](https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app)

# Expo push notifications setup

_Learn how to set up push notifications, get credentials for development and production, and send a testing push notification._

To utilize Expo push notification service, you must configure your app by installing a set of libraries, implement functions to handle notifications, and set up credentials for Android and iOS.

Complete the steps outlined in this guide or follow the more detailed video below. At the end, you'll be able to send a push notification and receive it on a device.

[Expo Notifications with EAS | Complete Guide](https://www.youtube.com/watch?v=BCCjGtKtBjE)

<br />

To get the client-side ready for push notifications, the following things are required:

- The user's permission to send them push notifications.
- The app's [`ExpoPushToken`](https://docs.expo.dev/versions/latest/sdk/notifications/#expopushtoken).

<br />

#### Do you want to use FCM / APNs directly, instead of the Expo push notification service?

If you need finer-grained control over your notifications, communicating directly with FCM and APNs may be necessary. Expo does not lock you into using Expo Application Services, and the `expo-notifications` API is push-service agnostic. Learn how to ["Send notifications with FCM and APNs"](https://docs.expo.dev/push-notifications/sending-notifications-custom/).

## Prerequisites

> **warning** **Important:** Push notifications are not supported on Android Emulators and iOS Simulators. A real device is required.

The following steps described in this guide use [EAS Build](https://docs.expo.dev/build/introduction/). This is the easiest way to set up notifications since your EAS project will also contain the [notification credentials](#get-credentials-for-development-builds). However, you can use the `expo-notifications` library without EAS Build by building [your project locally](https://docs.expo.dev/guides/local-app-development/).

<Step label="1">

## Install libraries

Run the following command to install the `expo-notifications`, `expo-device` and `expo-constants` libraries:

```bash
$ npx expo install expo-notifications expo-device expo-constants
```

- [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications) library is used to request a user's permission and to obtain the `ExpoPushToken` for sending push notifications.
- [`expo-device`](https://docs.expo.dev/versions/latest/sdk/device) is used to check whether the app is running on a physical device.
- [`expo-constants`](https://docs.expo.dev/versions/latest/sdk/constants) is used to get the `projectId` value from the app config.

</Step>

<Step label="2">

## Add config plugin

Add the `expo-notifications` plugin in the `plugins` array of your [app config](https://docs.expo.dev/workflow/configuration/):

```json app.json
{
  "expo": {
    /* @hide ... */ /* @end */
    "plugins": [
      /* @hide ... */ /* @end */
      "expo-notifications"
      ]
  }
}
```

</Step>

<Step label="3">

## Add a minimal working example

The code below shows a working example of how to register for, send, and receive push notifications in a React Native app. Copy and paste it into your project:

```tsx App.tsx
import { useState, useEffect, useRef } from 'react';
import { Text, View, Button, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

/* @info This handler determines how your app handles notifications that come in while the app is foregrounded. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
/* @end */

/* @info Sends a notification to Expo. Can also use Expo push notification tool at https://expo.dev/notifications. */
async function sendPushNotification(expoPushToken: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: 'Original Title',
    body: 'And here is the body!',
    data: { someData: 'goes here' },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}
/* @end */

function handleRegistrationError(errorMessage: string) {
  alert(errorMessage);
  throw new Error(errorMessage);
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      handleRegistrationError('Permission not granted to get push token for push notification!');
      return;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      handleRegistrationError('Project ID not found');
    }
    try {
      /* @info This fetches the Expo push token (if not previously fetched), which is unique to this device and projectID. */
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      /* @end */
      console.log(pushTokenString);
      return pushTokenString;
    } catch (e: unknown) {
      handleRegistrationError(`${e}`);
    }
  } else {
    handleRegistrationError('Must use physical device for push notifications');
  }
}

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  );

  useEffect(() => {
    /* @info Gets the push token and displays it in the UI, or in case of an error, displays the error message. */
    registerForPushNotificationsAsync()
      .then(token => setExpoPushToken(token ?? ''))
      .catch((error: any) => setExpoPushToken(`${error}`));
    /* @end */

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-around' }}>
      <Text>Your Expo push token: {expoPushToken}</Text>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text>Title: {notification && notification.request.content.title} </Text>
        <Text>Body: {notification && notification.request.content.body}</Text>
        <Text>Data: {notification && JSON.stringify(notification.request.content.data)}</Text>
      </View>
      <Button
        title="Press to Send Notification"
        onPress={async () => {
          await sendPushNotification(expoPushToken);
        }}
      />
    </View>
  );
}
```

### Configure `projectId`

Using the previous example, when you are registering for push notifications, you need to use [`projectId`](https://docs.expo.dev/versions/latest/sdk/constants/#easconfig). This property is used to attribute Expo push token to the specific project. For projects using EAS, the `projectId` property represents the Universally Unique Identifier (UUID) of that project.

`projectId` is set automatically when you create a development build. However, **we recommend setting it manually in your project's code**. To do so, you can use [`expo-constants`](https://docs.expo.dev/versions/latest/sdk/constants/) to get the `projectId` value from the app config.

```ts
const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
const pushTokenString = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
```

One advantage of attributing the Expo push token to your project's ID is that it doesn't change when a project is transferred between different accounts or the existing account gets renamed.

</Step>

<Step label="4">

## Get credentials for development builds

For Android and iOS, there are different requirements to set up your credentials.

<Tabs tabs={["Android", "iOS"]}>
  <Tab>
    For Android, you need to configure **Firebase Cloud Messaging (FCM)** to get credentials and set up your Expo project.

    Follow the steps in [Add Android FCM V1 credentials](https://docs.expo.dev/push-notifications/fcm-credentials) to set up your credentials.

  </Tab>
  <Tab>
    > **warning** A paid Apple Developer Account is required to generate credentials.

    For iOS, make sure you have [registered your iOS device](https://docs.expo.dev/develop/development-builds/create-a-build/#create-a-development-build-for-the-device) on which you want to test before running the `eas build` command for the first time.

    If you create a development build for the first time, you'll be asked to enable push notifications. Answer yes to the following questions when prompted by the EAS CLI:

    - Setup Push Notifications for your project
    - Generating a new Apple Push Notifications service key

  </Tab>
</Tabs>

<br />

> If you are not using EAS Build, run `eas credentials` manually.

</Step>

<Step label="5">
## Build the app

```bash
$ eas build
```

</Step>

<Step label="6">
## Test using the push notifications tool

After creating and installing the development build, you can use [Expo push notifications tool](https://expo.dev/notifications) to quickly send a test notification to your device.

1. Start the development server for your project:

```bash
$ npx expo start
```

2. Open the development build on your device.

3. After the `ExpoPushToken` is generated, enter the value in the Expo push notifications tool with other details (for example, a message title and body).

4. Click on the **Send a Notification** button.

   [Expo push notifications tool overview.](https://docs.expo.dev/static/images/notifications/push-notifications-tool-overview.png)

After sending the notification from the tool, you should see the notification on your device. Below is an example of an Android device receiving a push notification.

  [An Android device receiving a push notification.](https://docs.expo.dev/static/images/notifications/notification-on-android.png)
</Step>

# Send notifications with the Expo Push Service

_Learn how to call Expo Push Service API to send push notifications from your server._

The [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications) library provides all the client-side functionality for push notifications. Expo also handles sending push notifications off to FCM and APNs which then send them to particular devices. All you need to do is send a request to Expo Push API with the `ExpoPushToken` you obtain with [`getExpoPushTokenAsync`](https://docs.expo.dev/versions/latest/sdk/notifications/#getexpopushtokenasyncoptions).

> If you'd rather build a server that communicates with APNs and FCM directly, see [Send notifications with FCM and APNs](https://docs.expo.dev/push-notifications/sending-notifications-custom/). It's more complex than using Expo Push Service, but allows finer-grained control, and full access to all FCM and APNs features.

[Diagram explaining sending a push from your server to device](https://docs.expo.dev/static/images/sending-notification.png)

## Send push notifications using a server

After you setup your push notification credentials and add logic to get the `ExpoPushToken`, you can send it to the Expo API using an HTTPS POST request. You can do this by setting up a server with a database (or you can also write a command line tool to send them or send them straight from your app).

The Expo team and community have taken care of creating back-ends for you in a few different languages:

| SDKs                                                                                                     | Back-end | Maintained by |
| -------------------------------------------------------------------------------------------------------- | -------- | ------------- |
| [expo-server-sdk-node](https://github.com/expo/expo-server-sdk-node)                                     | Node.js  | Expo team     |
| [expo-server-sdk-python](https://github.com/expo/expo-server-sdk-python)                                 | Python   | Community     |
| [expo-server-sdk-ruby](https://github.com/expo/expo-server-sdk-ruby)                                     | Ruby     | Community     |
| [expo-push-notification-client-rust](https://github.com/katayama8000/expo-push-notification-client-rust) | Rust     | Community     |
| [expo-notifier](https://github.com/symfony/expo-notifier)                                                | Symfony  | Symfony       |
| [exponent-server-sdk-php](https://github.com/Alymosul/exponent-server-sdk-php)                           | PHP      | Community     |
| [expo-server-sdk-php](https://github.com/ctwillie/expo-server-sdk-php)                                   | PHP      | Community     |
| [exponent-server-sdk-golang](https://github.com/oliveroneill/exponent-server-sdk-golang)                 | Golang   | Community     |
| [exponent](https://github.com/9ssi7/exponent)                                                            | Golang   | Community     |
| [exponent-server-sdk-elixir](https://github.com/pachun/exponent-server-sdk-elixir)                       | Elixir   | Community     |
| [expo-server-sdk-dotnet](https://github.com/glyphard/expo-server-sdk-dotnet)                             | dotnet   | Community     |
| [expo-server-sdk-java](https://github.com/hlspablo/expo-server-sdk-java)                                 | Java     | Community     |
| [laravel-expo-notifier](https://github.com/YieldStudio/laravel-expo-notifier)                            | Laravel  | Community     |

Each of the example servers above is a wrapper around Expo Push Service API.

## Implement push notifications reliably

Push Notifications travel through several systems from your server to recipient devices. Notifications are delivered most of the time. However, occasionally there are issues with systems along the way and the network connections between them. Handling errors helps push notifications to arrive at their destinations more reliably.

### Limit concurrent connections

When sending a large number of push notifications at once, limit the number of your concurrent connections. The [Node SDK](https://github.com/expo/expo-server-sdk-node) implements this for you and opens a maximum of six concurrent connections. This smooths out your peak load and helps the Expo push notification service receive push notification requests successfully.

### Retry on failure

The first step in sending push notifications is to deliver them to the Expo push notification service, which internally adds them to a queue for delivery to Google (FCM v1) and Apple (APNs). This first step can fail for several reasons:

- network issues between your server and the Expo push notification service
- an outage or degraded availability of the Expo notification service
- misconfigured push credentials
- an invalid notification payload

Some of these failures are temporary. For example, if the Expo push notification service is down or unreachable and you get a network error - a HTTP 429 error (Too Many Requests), or a HTTP 5xx error (Server Errors) - use [exponential backoff](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) to wait a few seconds before retrying. If the first retry attempt is unsuccessful, wait for longer (follow exponential backoff) and retry again. This lets the temporarily unavailable service recover before you retry.

Other failures will not resolve themselves. For example, if your push notification payload is malformed, you may get an HTTP 400 response explaining the issue with the payload. You will also get an error if there are no push credentials for your project or if you send push notifications for different projects in the same request.

### Check push receipts for errors

The Expo push notification service responds with [**push tickets**](#push-tickets) upon successfully receiving notifications. A push ticket indicates that Expo has received your notification payload but may still need to send it. Each push ticket contains a ticket ID, which you later use to look up a [push receipt](#push-receipts). A push receipt is available after Expo has tried to deliver the notification to FCM or APNs. It tells you whether delivery to the push notification provider was successful.

You must check your push receipts. If there is an issue delivering push notifications, the push receipts are the best way to get information about the underlying cause. For example, the receipts may indicate a problem with FCMs or APNs, the Expo push notification service, or your notification payload.

Push receipts may also tell you if a recipient device has unsubscribed from notifications (for example, by revoking notification permissions or uninstalling your app) if APNs or FCM responds with that information. The push receipt will contain a `details` → `error` field set to `DeviceNotRegistered`. In this scenario, stop sending notifications to this device's push token until it re-registers with your server, so your app remains a good citizen. The `DeviceNotRegistered` error appears in push receipts only when Google or Apple deems the device to be unregistered. It takes an undefined amount of time and is often impossible to test by uninstalling your app and sending a push notification shortly after.

We recommend checking push receipts 15 minutes after sending your push notifications. While push receipts are often available much sooner, a 15-minute window gives the Expo push notification service a comfortable amount of time to make the receipts available to you. If after 15 minutes there is no push receipt, this likely indicates an error with the Expo push notification service. Lastly, push receipts are cleared after 24 hours.

### SLAs

The Expo push notification service does not have an SLA and the FCM and APNs services also may have occasional outages. By following the guidance above, you can make your application robust against temporary service interruptions.

## HTTP/2 API

Instead of using one of the libraries listed earlier, you may want to send requests directly to our HTTP/2 API (this API currently does not require any authentication).

To do so, send a POST request to `https://exp.host/--/api/v2/push/send` with the following HTTP headers:

```text
host: exp.host
accept: application/json
accept-encoding: gzip, deflate
content-type: application/json
```

This is a "hello world" push notification using cURL that you can send using your terminal (replace the placeholder push token with your own):

```sh
curl -H "Content-Type: application/json" -X POST "https://exp.host/--/api/v2/push/send" -d '{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title":"hello",
  "body": "world"
}'
```

The request body must be JSON. It may either be a single [message object](#message-request-format) (as shown in the example above) or an array of up to 100 message objects, as long as they are all for the same project as shown below. **We recommend using an array when you want to send multiple messages to efficiently minimize the number of requests you need to make to Expo servers.** Here's an example request body that sends four messages:

```json
[
  {
    "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "sound": "default",
    "body": "Hello world!"
  },
  {
    "to": "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]",
    "badge": 1,
    "body": "You've got mail"
  },
  {
    "to": [
      "ExponentPushToken[zzzzzzzzzzzzzzzzzzzzzz]",
      "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]"
    ],
    "body": "Breaking news!"
  }
]
```

The Expo Push Service also optionally accepts gzip-compressed request bodies. This can greatly reduce the amount of upload bandwidth needed to send large numbers of notifications. The [Node Expo Server SDK](https://github.com/expo/expo-server-sdk-node) automatically gzips requests for you and automatically throttles your requests to smooth out the load, so we highly recommend it.

### Push tickets

The requests above will respond with a JSON object with two optional fields, `data` and `errors`. `data` will contain an array of [**push tickets**](#push-ticket-format) in the same order in which the messages were sent (or one push ticket object, if you send a single message to a single recipient). Each ticket includes a `status` field indicating whether Expo successfully received the notification and, if successful, an `id` field that can be used to retrieve a push receipt later.

> A status of `ok` along with a receipt ID means that the message was received by Expo's servers, **not** that it was received by the user (for that you will need to check the [push receipt](#push-receipts)).

Continuing the above example, this is what a successful response body looks like:

```json
{
  "data": [
    { "status": "ok", "id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" },
    { "status": "ok", "id": "YYYYYYYY-YYYY-YYYY-YYYY-YYYYYYYYYYYY" },
    { "status": "ok", "id": "ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ" },
    { "status": "ok", "id": "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA" }
  ]
}
```

If there were errors with individual messages, but not the entire request, the bad messages' corresponding push tickets will have a status of `error`, and fields that describe the error as shown below:

```json
{
  "data": [
    {
      "status": "error",
      "message": "\"ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]\" is not a registered push notification recipient",
      "details": {
        "error": "DeviceNotRegistered"
      }
    },
    {
      "status": "ok",
      "id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }
  ]
}
```

If the entire request failed, the HTTP status code is 4xx or 5xx and the `errors` field will be an array of error objects (usually just one). Otherwise, the HTTP status code will be 200 and your messages will be on their way to the Android and iOS push notification services.

### Push receipts

After receiving a batch of notifications, Expo enqueues each notification to deliver to the Android and iOS push notification services (FCM and APNs, respectively). Most notifications are typically delivered within a few seconds. However, sometimes it may take longer to deliver notifications, particularly if the Android or iOS push notification services take longer than usual to receive and deliver notifications or if Expo's Push Service infrastructure is under high load.

Once Expo delivers a notification to the Android or iOS push notification service, Expo creates a [**push receipt**](#push-receipt-response-format) that indicates whether the Android or iOS push notification service successfully received the notification. If there was an error in delivering the notification, perhaps due to faulty credentials or service downtime, the push receipt will contain more information regarding that error.

To fetch the push receipts, send a POST request to `https://exp.host/--/api/v2/push/getReceipts`. The [request body](#push-receipt-request-format) must be a JSON object with a field name `ids` that is an array of ticket ID strings:

```sh
curl -H "Content-Type: application/json" -X POST "https://exp.host/--/api/v2/push/getReceipts" -d '{
  "ids": [
    "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
    "YYYYYYYY-YYYY-YYYY-YYYY-YYYYYYYYYYYY",
    "ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ"
  ]
}'
```

The [response body](#push-receipt-response-format) for push receipts is very similar to that of push tickets; it is a JSON object with two optional fields, `data` and `errors`. `data` contains a mapping of receipt IDs to receipts. Receipts include a `status` field, and two optional `message` and `details` fields (in the case where `"status": "error"`). If there is no push receipt for a requested receipt ID, the mapping won't contain that ID. This is what a successful response to the above request looks like:

```json
{
  "data": {
    "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX": { "status": "ok" },
    "ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ": { "status": "ok" }
    // When there is no receipt with a given ID (YYYYYYYY-YYYY-YYYY-YYYY-YYYYYYYYYYYY in this
    // example), the ID is omitted from the response.
  }
}
```

**You must check each push receipt, since it may contain information about errors you need to resolve.** For example, if a device is no longer eligible to receive notifications, Apple's documentation asks that you stop sending notifications to that device. The push receipts contain information about these errors.

> Even if a receipt's `status` says `ok`, this doesn't guarantee that the device has received the message; "ok" in a push receipt means that the Android (FCM) or iOS (APNs) push notification service successfully received the notification. If the recipient device is turned off, for example, the iOS or Android push notification service will try to deliver the message but the device won't necessarily receive it.

If the entire request failed, the HTTP status code will be 4xx or 5xx and the `errors` field will be an array of error objects (usually just one). Otherwise, the HTTP status code will be 200 and your messages will be on their way to your users' devices.

## Errors

Expo provides details regarding any errors that occur during this entire process. We'll cover some of the most common errors below so that you can implement logic to handle them automatically on your server.

If for whatever reason, Expo couldn't deliver the message to the Android or iOS push notification service, the push receipt's details may also include service-specific information. This is useful mostly for debugging and reporting possible bugs to Expo.

### Individual errors

Inside both push tickets and push receipts, look for a `details` object with an `error` field. If present, it may be one of the following values, and you should handle these errors like so:

### Push ticket errors

- `DeviceNotRegistered`: The device cannot receive push notifications anymore and you should stop sending messages to the corresponding Expo push token.

### Push receipt errors

- `DeviceNotRegistered`: The device cannot receive push notifications anymore and you should stop sending messages to the corresponding Expo push token.

- `MessageTooBig`: The total notification payload was too large. On Android and iOS, the total payload must be at most 4096 bytes.

- `MessageRateExceeded`: You are sending messages too frequently to the given device. Implement exponential backoff and slowly retry sending messages.

- `MismatchSenderId`: This indicates that there is an issue with your FCM push credentials. There are two pieces to FCM push credentials: your FCM server key, and your **google-services.json** file. Both must be associated with the same sender ID. You can find your sender ID in the [same place you find your server key](https://docs.expo.dev/push-notifications/push-notifications-setup/#upload-server-credentials). Check that the server key from your project's EAS dashboard under **Credentials** > **Application identifier** > **Service Credentials** > **FCM V1 service account key** and that the sender ID from your project's **google-services.json** > `project_number` is the same as shown in the Firebase console under **Project Settings** > **Cloud Messaging** tab > **Cloud Messaging API (Legacy)**.

- `InvalidCredentials`: Your push notification credentials for your standalone app are invalid (for example, you may have revoked them).
  - **Android**: Make sure that you have correctly uploaded the server key from the Firebase Console as specified in [uploading FCM V1 server credentials](https://docs.expo.dev/push-notifications/fcm-credentials).
  - **iOS**: Run `eas credentials` and follow the prompts to regenerate new push notification credentials. If you revoke an APN key, all apps that rely on that key will no longer be able to send or receive push notifications until you upload a new key to replace it. Uploading a new APN key will **not** change your users' Expo Push Tokens. Sometimes, these errors will contain further details claiming an `InvalidProviderToken` error. This is actually tied to both your APN key **and** your provisioning profile. To resolve this error, you should rebuild the app and regenerate a new push key and provisioning profile.

> For a better understanding of iOS credentials, including push notification credentials, read our [App Signing docs](https://docs.expo.dev/app-signing/app-credentials#ios).

### Request errors

If there's an error with the entire request for either push tickets or push receipts, the `errors` object might have one of the following values, and you should handle these errors:

- `TOO_MANY_REQUESTS`: You are exceeding the request limit of 600 notifications per second per project. We recommend implementing rate-limiting in your server to prevent sending more than 600 notifications per second (note that if you use [expo-server-sdk-node](https://github.com/expo/expo-server-sdk-node), this is already implemented along with exponential backoffs for retries).

- `PUSH_TOO_MANY_EXPERIENCE_IDS`: You are trying to send push notifications to different Expo experiences, for example, `@username/projectAAA` and `@username/projectBBB`. Check the `details` field for a mapping of experience names to their associated push tokens from the request, and remove any from another experience.

- `PUSH_TOO_MANY_NOTIFICATIONS`: You are trying to send more than 100 push notifications in one request. Make sure you are only sending 100 (or fewer) notifications in each request.

- `PUSH_TOO_MANY_RECEIPTS`: You are trying to get more than 1000 push receipts in one request. Make sure you are only sending an array of 1000 (or fewer) ticket ID strings to get your push receipts.

## Additional security

You can require any push requests to be sent with a valid [access token](https://docs.expo.dev/accounts/programmatic-access) before we will deliver them to your users. You can enable this enhanced push security from your [EAS Dashboard](https://expo.dev/settings/access-tokens).

By default, you can send a notification to your users by sending their Expo Push Token and any text or additional data needed for the message. This is easy to set up, but **if the tokens are leaked, a malicious user would be able to impersonate your server and send their message to your users.** We have never had an instance of this report. However, to follow best security practices, we offer the use of an access token alongside the push token as an additional layer of security.

If you're using the [`expo-server-sdk-node`](https://github.com/expo/expo-server-sdk-node#usage), upgrade to at least `v3.6.0` and pass your `accessToken` as an option in the constructor. Otherwise, pass in the header `'Authorization': 'Bearer ${accessToken}'` with any requests to our push API.

Any requests sent _without_ a valid access token _after_ you enable push security will result in an error with code: `UNAUTHORIZED`.

## Formats

### Message request format

Each message must be a JSON object with the given fields (only the `to` field is required):

| Field               | Platform        | Type                                                      | Description                                                                                                                                                                                                                                                                                                                                                               |
| ------------------- | --------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `to`                | Android and iOS | `string \| string[]`                                      | An Expo push token or an array of Expo push tokens specifying the recipient(s) of this message.                                                                                                                                                                                                                                                                           |
| `_contentAvailable` | iOS Only        | `boolean \| undefined`                                    | When this is set to true, the notification will cause the iOS app to start in the background to run a [background task](https://docs.expo.dev/versions/latest/sdk/notifications/#background-notifications). Your app needs to be [configured](https://docs.expo.dev/versions/latest/sdk/notifications/#background-notification-configuration) to support this.                                                      |
| `data`              | Android and iOS | `Object`                                                  | A JSON object delivered to your app. It may be up to about 4KiB; the total notification payload sent to Apple and Google must be at most 4KiB or else you will get a "Message Too Big" error.                                                                                                                                                                             |
| `title`             | Android and iOS | `string`                                                  | The title to display in the notification. Often displayed above the notification body. Maps to [`AndroidNotification.title`](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#AndroidNotification) and [`aps.alert.title`](https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification#Payload-key-reference).   |
| `body`              | Android and iOS | `string`                                                  | The message to display in the notification. Maps to [`AndroidNotification.body`](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#AndroidNotification) and [`aps.alert.body`](https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification#Payload-key-reference).                                                |
| `ttl`               | Android and iOS | `number`                                                  | Time to Live: the number of seconds for which the message may be kept around for redelivery if it hasn't been delivered yet. Defaults to `undefined` to use the respective defaults of each provider (1 month for Android/FCM as well as iOS/APNs).                                                                                                                       |
| `expiration`        | Android and iOS | `number`                                                  | Timestamp since the Unix epoch specifying when the message expires. Same effect as `ttl` (`ttl` takes precedence over `expiration`).                                                                                                                                                                                                                                      |
| `priority`          | Android and iOS | `'default' \| 'normal' \| 'high'`                         | The delivery priority of the message. Specify `default` or omit this field to use the default priority on each platform ("normal" on Android and "high" on iOS).                                                                                                                                                                                                          |
| `subtitle`          | iOS Only        | `string`                                                  | The subtitle to display in the notification below the title. Maps to [`aps.alert.subtitle`](https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification#Payload-key-reference).                                                                                                                                                          |
| `sound`             | iOS Only        | `string \| null`                                          | Play a sound when the recipient receives this notification. Specify `default` to play the device's default notification sound, or omit this field to play no sound. Custom sounds need to be [configured](https://docs.expo.dev/versions/latest/sdk/notifications/#configurable-properties) via the config plugin and then specified including the file extension. Example: `bells_sound.wav`. |
| `badge`             | iOS Only        | `number`                                                  | Number to display in the badge on the app icon. Specify zero to clear the badge.                                                                                                                                                                                                                                                                                          |
| `interruptionLevel` | iOS Only        | `'active' \| 'critical' \| 'passive' \| 'time-sensitive'` | The importance and delivery timing of a notification. The string values correspond to the [`UNNotificationInterruptionLevel`](https://developer.apple.com/documentation/usernotifications/unnotificationinterruptionlevel) enumeration cases.                                                                                                                             |
| `channelId`         | Android Only    | `string`                                                  | ID of the Notification Channel through which to display this notification. If an ID is specified but the corresponding channel does not exist on the device (that has not yet been created by your app), the notification will not be displayed to the user.                                                                                                              |
| `icon`              | Android Only    | `string`                                                  | The notification's icon. Name of an Android drawable resource (example: `myicon`). Defaults to the icon specified in the [config plugin](https://docs.expo.dev/versions/latest/sdk/notifications/#configurable-properties).                                                                                                                                                                    |
| `richContent`       | Android and iOS | `Object`                                                  | Currently supports setting a notification image. Provide an object with key `image` and value of type `string`, which is the image URL. Android will show the image out of the box. On iOS, you need to add a Notification Service Extension target to your app. See [this example](https://github.com/expo/expo/pull/36202) on how to do that.                           |
| `categoryId`        | Android and iOS | `string`                                                  | ID of the notification category that this notification is associated with. [Find out more about notification categories here](https://docs.expo.dev/versions/latest/sdk/notifications/#manage-notification-categories-interactive-notifications).                                                                                                                                              |
| `mutableContent`    | iOS Only        | `boolean`                                                 | Specifies whether this notification can be [intercepted by the client app](https://developer.apple.com/documentation/usernotifications/modifying_content_in_newly_delivered_notifications?language=objc). Defaults to `false`.                                                                                                                                            |

**Note on `ttl`**: On Android, we make our best effort to deliver messages with zero TTL immediately and do not throttle them. However, setting TTL to a low value (for example, zero) can prevent normal-priority notifications from ever reaching Android devices that are in doze mode. To guarantee that a notification is delivered, TTL must be long enough for the device to wake from doze mode. This field takes precedence over `expiration` when both are specified.

**Note on `priority`**: On Android, normal-priority messages won't open network connections on sleeping devices and their delivery may be delayed to conserve the battery. High-priority messages are more likely to be delivered immediately and may wake sleeping devices to open network connections, consuming energy. On iOS, normal-priority messages are sent at a time that takes into account power considerations for the device and may be grouped and delivered in bursts. They are throttled and may not be delivered by Apple. High-priority messages are usually sent immediately. Normal priority corresponds to APNs priority level 5 and high priority to 10.

**Note on `channelId`**: If left null, a "Default" channel is used, and Expo creates the channel on the device if it does not yet exist. However, use caution, as the "Default" channel is user-facing and you may not be able to fully delete it.

### Push ticket format

```js
{
  "data": [
    {
      "status": "error" | "ok",
      "id": string, // this is the Receipt ID
      // if status === "error"
      "message": string,
      "details": JSON
    },
    ...
  ],
  // only populated if there was an error with the entire request
  "errors": [{
    "code": string,
    "message": string
  }]
}
```

### Push receipt request format

```js
{
  "ids": string[]
}
```

### Push receipt response format

```js
{
  "data": {
    Receipt ID: {
      "status": "error" | "ok",
      // if status === "error"
      "message": string,
      "details": JSON
    },
    ...
  },
  // only populated if there was an error with the entire request
  "errors": [{
    "code": string,
    "message": string
  }]
}
```

## Delivery guarantees

Expo makes a best effort to deliver notifications to the push notification services operated by Google and Apple. Expo's infrastructure is designed for at least one attempt at delivery to the underlying push notification services. It is more likely for a notification to be delivered to Google or Apple more than once rather than not at all; however, both these results are uncommon.

After a notification has been handed off to an underlying push notification service, Expo creates a "push receipt" that records whether the handoff was successful. A push receipt denotes whether the underlying push notification service received the notification.

Finally, the push notification services from Google and Apple follow their own policies to deliver the notifications to the device.

## Troubleshooting

#### Network connectivity issues

This section helps you diagnose and resolve common network issues. Your server must have connectivity to Google Cloud Platform services in the United States region, as this is where Expo's push notification service is hosted.

#### DNS resolution

Test if your server can resolve Expo's push service domain name:

```bash
dig exp.host

# Check with a public DNS server
dig @8.8.8.8 exp.host
```

#### Network routing and connectivity

Verify your server can reach Expo's endpoints:

```bash
# Use traceroute to identify routing issues
traceroute exp.host

# Test basic connectivity
ping exp.host

# Test HTTPS connectivity to the push server.
# You should receive HTTP response headers with a 200 status code.
curl --verbose https://exp.host/
```

Common issues to check:

- Firewall rules blocking outbound HTTPS (port 443) traffic
- Corporate proxy servers that may require authentication or special configuration
- Network ACLs or security groups (in cloud environments) restricting outbound connections
- Packet fragmentation due to MTU size issues

#### TLS certificate validation

Ensure your server can validate the server's TLS certificate:

```bash
openssl s_client -connect exp.host:443 -servername exp.host
```

We use standard TLS certificates signed by major service providers including Cloudflare, Google, and Let's Encrypt.

# Handle incoming notifications

_Learn how to respond to a notification received by your app and take action based on the event._

The [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications) library contains event listeners that handle how your app responds when receiving a notification.

## Notification event listeners

The [`addNotificationReceivedListener`](https://docs.expo.dev/versions/latest/sdk/notifications/#addnotificationreceivedlistenerlistener) and [`addNotificationResponseReceivedListener`](https://docs.expo.dev/versions/latest/sdk/notifications/#addnotificationresponsereceivedlistenerlistener) event listeners receive an object when a notification is received or interacted with.

These listeners allow you to add behavior when notifications are received while your app is open and foregrounded and when your app is backgrounded or closed and the user taps on the notification.

```js
useEffect(() => {
  registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

  /* @info This listener is fired whenever a notification is received while the app is foregrounded. */
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log(notification);
  });
  /* @end */

  /* @info This listener is fired whenever a user taps on or interacts with a notification (works when an app is foregrounded, backgrounded, or killed). */
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log(response);
  });
  /* @end */

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}, []);
```

Android notification object example from <CODE>addNotificationReceivedListener</CODE></>}>

Sample of the `notification` object received by the callback function when using `Notifications.addNotificationReceivedListener`:

```json
// console.log(notification);
{
  "request": {
    "trigger": {
      "remoteMessage": {
        "originalPriority": 2,
        "sentTime": 1724782348210,
        "notification": {
          "usesDefaultVibrateSettings": false,
          "color": null,
          "channelId": null,
          "visibility": null,
          "sound": null,
          "tag": null,
          "bodyLocalizationArgs": null,
          "imageUrl": null,
          "title": "Chat App",
          "ticker": null,
          "eventTime": null,
          "body": "New message from John Doe",
          "titleLocalizationKey": null,
          "notificationPriority": null,
          "icon": null,
          "usesDefaultLightSettings": false,
          "sticky": false,
          "link": null,
          "titleLocalizationArgs": null,
          "bodyLocalizationKey": null,
          "usesDefaultSound": false,
          "clickAction": null,
          "localOnly": false,
          "lightSettings": null,
          "notificationCount": null
        },
        "data": {
          "channelId": "default",
          "message": "New message from John Doe",
          "title": "Chat App",
          "body": "{\"senderId\":\"user123\",\"senderName\":\"John Doe\",\"messageId\":\"msg789\",\"conversationId\":\"conversation-456\",\"messageType\":\"text\",\"timestamp\":1724766427}",
          "scopeKey": "@betoatexpo/expo-notifications-app",
          "experienceId": "@betoatexpo/expo-notifications-app",
          "projectId": "51092087-87a4-4b12-8008-145625477434"
        },
        "to": null,
        "ttl": 0,
        "collapseKey": "dev.expo.notificationsapp",
        "messageType": null,
        "priority": 2,
        "from": "115310547649",
        "messageId": "0:1724782348220771%0f02879c0f02879c"
      },
      "channelId": "default",
      "type": "push"
    },
    "content": {
      "autoDismiss": true,
      "title": "Chat App",
      "badge": null,
      "sticky": false,
      "sound": "default",
      "body": "New message from John Doe",
      "subtitle": null,
      "data": {
        "senderId": "user123",
        "senderName": "John Doe",
        "messageId": "msg789",
        "conversationId": "conversation-456",
        "messageType": "text",
        "timestamp": 1724766427
      }
    },
    "identifier": "0:1724782348220771%0f02879c0f02879c"
  },
  "date": 1724782348210
}
```

You can directly access the notification custom data by logging the `notification.request.content.data` object:

```json
// console.log(notification.request.content.data);
{
  "senderId": "user123",
  "senderName": "John Doe",
  "messageId": "msg789",
  "conversationId": "conversation-456",
  "messageType": "text",
  "timestamp": 1724766427
}
```

iOS notification object example from <CODE>addNotificationReceivedListener</CODE></>}>

Sample of the `notification` object received by the callback function when using `Notifications.addNotificationReceivedListener`:

```json
// console.log(notification);
{
  "request": {
    "trigger": {
      "class": "UNPushNotificationTrigger",
      "type": "push",
      "payload": {
        "experienceId": "@betoatexpo/expo-notifications-app",
        "projectId": "51092087-87a4-4b12-8008-145625477434",
        "scopeKey": "@betoatexpo/expo-notifications-app",
        "aps": {
          "thread-id": "",
          "category": "",
          "badge": 1,
          "alert": {
            "subtitle": "Hey there! How's your day going?",
            "title": "Chat App",
            "launch-image": "",
            "body": "New message from John Doe"
          },
          "sound": "default"
        },
        "body": {
          "messageId": "msg789",
          "timestamp": 1724766427,
          "messageType": "text",
          "senderId": "user123",
          "senderName": "John Doe",
          "conversationId": "conversation-456"
        }
      }
    },
    "identifier": "3AEB849E-9059-4D09-BC3B-9A0B104CF062",
    "content": {
      "body": "New message from John Doe",
      "sound": "default",
      "launchImageName": "",
      "badge": 1,
      "subtitle": "Hey there! How's your day going?",
      "title": "Chat App",
      "data": {
        "conversationId": "conversation-456",
        "senderName": "John Doe",
        "senderId": "user123",
        "messageType": "text",
        "timestamp": 1724766427,
        "messageId": "msg789"
      },
      "summaryArgument": null,
      "categoryIdentifier": "",
      "attachments": [],
      "interruptionLevel": "active",
      "threadIdentifier": "",
      "targetContentIdentifier": null,
      "summaryArgumentCount": 0
    }
  },
  "date": 1724798493.0589335
}
```

You can directly access the notification custom data by logging the `notification.request.content.data` object:

```json
// console.log(notification.request.content.data);
{
  "senderId": "user123",
  "senderName": "John Doe",
  "messageId": "msg789",
  "conversationId": "conversation-456",
  "messageType": "text",
  "timestamp": 1724766427
}
```

For more information on these objects, see [`Notification`](https://docs.expo.dev/versions/latest/sdk/notifications/#notification) documentation.

## Foreground notification behavior

To handle the behavior when notifications are received when your app is **foregrounded**, use [`Notifications.setNotificationHandler`](https://docs.expo.dev/versions/latest/sdk/notifications/#handling-incoming-notifications-when-the-app-is) with the `handleNotification()` callback to set the following options:

- `shouldPlaySound`
- `shouldSetBadge`
- `shouldShowBanner`
- `shouldShowList`

```jsx
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
```

## Closed notification behavior

On Android, users can set certain OS-level settings, usually revolving around performance and battery optimization, that can prevent notifications from being delivered when the app is closed. For example, one such setting is the **Deep Clear** option on OnePlus devices using Android 9 and lower versions.