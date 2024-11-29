appstraction

# appstraction

## Table of contents

### Type Aliases

- [AndroidPermission](README.md#androidpermission)
- [AppMeta](README.md#appmeta)
- [AppPath](README.md#apppath)
- [CalendarEventData](README.md#calendareventdata)
- [ContactData](README.md#contactdata)
- [DeviceAttribute](README.md#deviceattribute)
- [GetDeviceAttributeOptions](README.md#getdeviceattributeoptions)
- [IosPermission](README.md#iospermission)
- [ObbInstallSpec](README.md#obbinstallspec)
- [PlatformApi](README.md#platformapi)
- [PlatformApiOptions](README.md#platformapioptions)
- [Proxy](README.md#proxy)
- [RunTargetOptions](README.md#runtargetoptions)
- [SupportedCapability](README.md#supportedcapability)
- [SupportedPlatform](README.md#supportedplatform)
- [SupportedRunTarget](README.md#supportedruntarget)
- [WireGuardConfig](README.md#wireguardconfig)

### Variables

- [androidPermissions](README.md#androidpermissions)
- [iosPermissions](README.md#iospermissions)

### Functions

- [listDevices](README.md#listdevices)
- [parseAppMeta](README.md#parseappmeta)
- [pause](README.md#pause)
- [platformApi](README.md#platformapi-1)

## Type Aliases

### AndroidPermission

Ƭ **AndroidPermission**: typeof [`androidPermissions`](README.md#androidpermissions)[`number`]

An ID of a known permission on Android.

#### Defined in

[android.ts:1137](https://github.com/tweaselORG/appstraction/blob/main/src/android.ts#L1137)

___

### AppMeta

Ƭ **AppMeta**: `Object`

Metadata about an app, as returned by [parseAppMeta](README.md#parseappmeta).

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `architectures` | (``"arm64"`` \| ``"arm"`` \| ``"x86"`` \| ``"x86_64"`` \| ``"mips"`` \| ``"mips64"``)[] | A list of the architectures that the app supports. The identifiers for the architectures are normalized across Android and iOS. On Android, this will be empty for apps that don't have native code. |
| `id` | `string` | The app/bundle ID. |
| `md5?` | `string` | The MD5 hash of the app's package file. In the case of split APKs on Android, this will be the hash of the main APK. In the case of custom APK bundle formats (`.xapk`, `.apkm` and `.apks`), this will be the hash of the entire bundle. **Be careful when interpreting this value.** App stores can deliver different distributions of the exact same app. For example, apps downloaded from the App Store on iOS include the user's Apple ID, thus leading to different hashes even if different users download the very same version of the same app. |
| `name?` | `string` | The app's display name. |
| `platform` | [`SupportedPlatform`](README.md#supportedplatform) | The platform the app is for. |
| `version?` | `string` | The app's human-readable version. |
| `versionCode?` | `string` | The app's version code. |

#### Defined in

[index.ts:40](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L40)

___

### AppPath

Ƭ **AppPath**<`Platform`\>: `Platform` extends ``"android"`` ? \`${string}.apk\` \| \`${string}.xapk\` \| \`${string}.apkm\` \| \`${string}.apks\` \| \`${string}.apk\`[] : \`${string}.ipa\`

On Android, the path to a single APK with the `.apk` extension, an array of paths to split APKs with the `.apk`
extension, the path to an XAPK file with the `.xapk` extension or the path to either an `.apkm` or `.apks` file.

On iOS, the path to an IPA file with the `.ipa` extension.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Platform` | extends [`SupportedPlatform`](README.md#supportedplatform) |

#### Defined in

[index.ts:24](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L24)

___

### CalendarEventData

Ƭ **CalendarEventData**: `Object`

Event to add to the device’s calendar.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `endDate` | `Date` | Date and time when the event should end. |
| `startDate` | `Date` | Date and time when the event should start. |
| `title` | `string` | Title of the event. |

#### Defined in

[index.ts:525](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L525)

___

### ContactData

Ƭ **ContactData**: `Object`

Contact to add to the device’s contacts.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `email?` | `string` | Email address of the contact. Will be added as ‘Home’. |
| `firstName?` | `string` | First name of the contact to add. |
| `lastName` | `string` | Last name of the contact to add. |
| `phoneNumber?` | `string` | Phone number of the contact. Will be added as ‘Home’. |

#### Defined in

[index.ts:534](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L534)

___

### DeviceAttribute

Ƭ **DeviceAttribute**<`Platform`\>: `Platform` extends ``"android"`` ? ``"apiLevel"`` \| ``"architectures"`` \| ``"manufacturer"`` \| ``"model"`` \| ``"modelCodeName"`` \| ``"name"`` \| ``"osBuild"`` \| ``"osVersion"`` : ``"architectures"`` \| ``"idfv"`` \| ``"manufacturer"`` \| ``"modelCodeName"`` \| ``"name"`` \| ``"osBuild"`` \| ``"osVersion"``

A supported attribute for the `getDeviceAttribute()` function, depending on the platform.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Platform` | extends [`SupportedPlatform`](README.md#supportedplatform) |

#### Defined in

[index.ts:504](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L504)

___

### GetDeviceAttributeOptions

Ƭ **GetDeviceAttributeOptions**: `Object`

The options for each attribute available through the `getDeviceAttribute()` function.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `idfv` | { `appId`: `string`  } | The options for the `idfv` attribute. |
| `idfv.appId` | `string` | The app ID of the app to get the `identifierForVendor` for. |

#### Defined in

[index.ts:508](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L508)

___

### IosPermission

Ƭ **IosPermission**: typeof [`iosPermissions`](README.md#iospermissions)[`number`]

An ID of a known permission on iOS.

#### Defined in

[ios.ts:662](https://github.com/tweaselORG/appstraction/blob/main/src/ios.ts#L662)

___

### ObbInstallSpec

Ƭ **ObbInstallSpec**: `Object`

An object that describes how an Android extension file (`.obb`) should be installed on the device.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `installPath?` | \`${string}.obb\` | Path in relation to `$EXTERNAL_STORAGE` in which to install the obb on the guest. Will be the default app folder (`$EXTERNAL_STORAGE/Android/obb/<app id>/<file name on host>`) if nothing is specified. |
| `obb` | \`${string}.obb\` | Path to the obb on the host. |

#### Defined in

[index.ts:29](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L29)

___

### PlatformApi

Ƭ **PlatformApi**<`Platform`, `RunTarget`, `Capabilities`, `Capability`\>: `Object`

Functions that are available for the platforms.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Platform` | extends [`SupportedPlatform`](README.md#supportedplatform) |
| `RunTarget` | extends [`SupportedRunTarget`](README.md#supportedruntarget)<`Platform`\> |
| `Capabilities` | extends [`SupportedCapability`](README.md#supportedcapability)<``"android"`` \| ``"ios"``\>[] |
| `Capability` | `Capabilities`[`number`] |

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `addCalendarEvent` | (`eventData`: [`CalendarEventData`](README.md#calendareventdata)) => `Promise`<`void`\> | Adds a simple event to the device’s calendar. Requires the `frida` capability. On Android, this currently only works if a calendar has already been set up. |
| `addContact` | (`contactData`: [`ContactData`](README.md#contactdata)) => `Promise`<`void`\> | Add a contact to the device’s contact book. Requires the `frida` capability. On Android, this currently only works if `com.android.contacts` is installed. |
| `clearStuckModals` | `Platform` extends ``"android"`` ? () => `Promise`<`void`\> : `never` | Clear any potential stuck modals by pressing the back button followed by the home button. This is currently broken on iOS (see https://github.com/tweaselORG/appstraction/issues/12). Requires the `ssh` capability on iOS. |
| `ensureDevice` | (`options?`: { `abortSignal?`: `AbortSignal`  }) => `Promise`<`void`\> | Assert that the selected device is connected and ready to be used with the selected capabilities, performing necessary setup steps. This should always be the first function you call. Note that depending on the capabilities you set, the setup steps may make permanent changes to your device. For Android, you can set the url to the WireGuard APK which should be installed in the `WIREGUARD_APK_URL` environment variable. Note that it is only used if WireGuard isn’t installed already. |
| `getDeviceAttribute` | <Attribute\>(`attribute`: `Attribute`, ...`options`: `Attribute` extends keyof [`GetDeviceAttributeOptions`](README.md#getdeviceattributeoptions) ? [options: GetDeviceAttributeOptions[Attribute]] : [options?: undefined]) => `Promise`<`string`\> | Get the value of the given device attribute. |
| `getForegroundAppId` | () => `Promise`<`string` \| `undefined`\> | Get the app ID of the running app that is currently in the foreground. Requires the `frida` capability on iOS. |
| `getPidForAppId` | (`appId`: `string`) => `Promise`<`number` \| `undefined`\> | Get the PID of the app with the given app ID if it is currently running. Requires the `frida` capability on iOS. |
| `getPrefs` | (`appId`: `string`) => `Promise`<`Record`<`string`, `unknown`\> \| `undefined`\> | Get the preferences (`SharedPreferences` on Android, `NSUserDefaults` on iOS) of the app with the given app ID. Requires the `frida` capability on Android and iOS. |
| `installApp` | (`appPath`: [`AppPath`](README.md#apppath)<`Platform`\>, `obbPaths?`: `Platform` extends ``"android"`` ? [`ObbInstallSpec`](README.md#obbinstallspec)[] : `never`) => `Promise`<`void`\> | Install the app at the given path. |
| `installCertificateAuthority` | (`path`: `string`) => `Promise`<`void`\> | Install the certificate authority with the given path as a trusted CA on the device. This allows you to intercept and modify traffic from apps on the device. On Android, this installs the CA as a system CA. As this is normally not possible on Android 10 and above, it overlays the `/system/etc/security/cacerts` directory with a tmpfs and installs the CA there. This means that the changes are not persistent across reboots. On iOS, the CA is installed permanently as a root certificate in the Certificate Trust Store. It persists across reboots.\ **Currently, you need to manually trust any CA at least once on the device, CAs can be added but not automatically marked as trusted (see: https://github.com/tweaselORG/appstraction/issues/44#issuecomment-1466151197).** Requires the `root` capability on Android, and the `ssh` capability on iOS. |
| `isAppInstalled` | (`appId`: `string`) => `Promise`<`boolean`\> | Check whether the app with the given app ID is installed. |
| `listApps` | (`options?`: { `includeSystem?`: `boolean`  }) => `Promise`<`string`[]\> | Get a list of the app IDs of all installed apps. |
| `removeCertificateAuthority` | (`path`: `string`) => `Promise`<`void`\> | Remove the certificate authority with the given path from the trusted CAs on the device. On Android, this works for system CAs, including those pre-installed with the OS. As this is normally not possible on Android 10 and above, it overlays the `/system/etc/security/cacerts` directory with a tmpfs and removes the CA there. This means that the changes are not persistent across reboots. On iOS, this only works for CAs in the Certificate Trust Store. It does not work for pre-installed OS CAs. The changes are persistent across reboots. Requires the `root` capability on Android, and the `ssh` capability on iOS. |
| `resetDevice` | `Platform` extends ``"android"`` ? `RunTarget` extends ``"emulator"`` ? (`snapshotName`: `string`, `options?`: { `abortSignal?`: `AbortSignal`  }) => `Promise`<`void`\> : `never` : `never` | Reset the device to the specified snapshot (only available for emulators). **`Param`** The name of the snapshot to reset to. **`Param`** Pass an AbortSignal to abort the waiting in case of a crash. This might not be graceful. |
| `setAppBackgroundBatteryUsage` | `Platform` extends ``"android"`` ? (`appId`: `string`, `state`: ``"unrestricted"`` \| ``"optimized"`` \| ``"restricted"``) => `Promise`<`void`\> : `never` | Configure whether the app's background battery usage should be restricted. Currently only supported on Android. **`Param`** The app ID of the app to configure the background battery usage settings for. **`Param`** The state to set the background battery usage to. On Android, the possible values are: - `unrestricted`: "Allow battery usage in background without restrictions. May use more battery." - `optimized`: "Optimize based on your usage. Recommended for most apps." (default after installation) - `restricted`: "Restrict battery usage while in background. Apps may not work as expected. Notifications may be delayed." |
| `setAppPermissions` | (`appId`: `string`, `permissions?`: `Platform` extends ``"ios"`` ? { [p in IosPermission]?: "unset" \| "allow" \| "deny" } & { `location?`: ``"ask"`` \| ``"never"`` \| ``"always"`` \| ``"while-using"``  } : `Partial`<`Record`<`LiteralUnion`<[`AndroidPermission`](README.md#androidpermission), `string`\>, ``"allow"`` \| ``"deny"``\>\>) => `Promise`<`void`\> | Set the permissions for the app with the given app ID. By default, it will grant all known permissions (including dangerous permissions on Android) and set the location permission on iOS to `always`. You can specify which permissions to grant/deny using the `permissions` argument. Requires the `ssh` and `frida` capabilities on iOS. |
| `setClipboard` | (`text`: `string`) => `Promise`<`void`\> | Set the clipboard to the given text. Requires the `frida` capability on Android and iOS. |
| `setDeviceName` | (`deviceName`: `string`) => `Promise`<`void`\> | Sets the name of the device, which shows up to other network or bluetooth devices. |
| `setProxy` | `Platform` extends ``"android"`` ? (`proxy`: ``"wireguard"`` extends `Capability` ? [`WireGuardConfig`](README.md#wireguardconfig) : [`Proxy`](README.md#proxy) \| ``null``) => `Promise`<`void`\> : `Platform` extends ``"ios"`` ? (`proxy`: [`Proxy`](README.md#proxy) \| ``null``) => `Promise`<`void`\> : `never` | Set or disable the proxy on the device. If you have enabled the `wireguard` capability, this will start or stop a WireGuard tunnel. Otherwise, it will set the global proxy on the device. On iOS, the proxy is set for the current WiFi network. It won't apply for other networks or for cellular data connections. WireGuard is currently only supported on Android. Enabling a WireGuard tunnel requires the `root` capability. **`Remarks`** The WireGuard integration will create a new tunnel in the app called `appstraction` and delete it when the proxy is stopped. If you have an existing tunnel with the same name, it will be overridden. **`Param`** The proxy to set, or `null` to disable the proxy. If you have enabled the `wireguard` capability, this is a string of the full WireGuard configuration to use. |
| `snapshotDeviceState` | `Platform` extends ``"android"`` ? `RunTarget` extends ``"emulator"`` ? (`snapshotName`: `string`, `options?`: { `abortSignal?`: `AbortSignal`  }) => `Promise`<`void`\> : `never` : `never` | Save the device state to the specified snapshot (only available for emulators). **`Param`** The name of the snapshot to save to. **`Param`** Pass an AbortSignal to abort the waiting in case of a crash. This might not be graceful. |
| `startApp` | (`appId`: `string`) => `Promise`<`void`\> | Start the app with the given app ID. Doesn't wait for the app to be ready. Also enables the certificate pinning bypass if enabled. Requires the `frida` or `ssh` capability on iOS. On Android, this will start the app with or without a certificate pinning bypass depending on the `certificate-pinning-bypass` capability. |
| `stopApp` | (`appId`: `string`) => `Promise`<`void`\> | Force-stop the app with the given app ID. |
| `target` | { `platform`: `Platform` ; `runTarget`: `RunTarget`  } | An indicator for what platform and run target this instance of PlatformApi is configured for. This is useful mostly to write typeguards. |
| `target.platform` | `Platform` | The platform this instance is configured for, i.e. `ios` or `android`. |
| `target.runTarget` | `RunTarget` | The run target this instance is configured for, i.e. `device` or `emulator`. |
| `uninstallApp` | (`appId`: `string`) => `Promise`<`void`\> | Uninstall the app with the given app ID. Will not fail if the app is not installed. This also removes any data stored by the app. |
| `waitForDevice` | (`tries?`: `number`, `options?`: { `abortSignal?`: `AbortSignal`  }) => `Promise`<`void`\> | Wait until the device or emulator has been connected and has booted up completely. |

#### Defined in

[index.ts:72](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L72)

___

### PlatformApiOptions

Ƭ **PlatformApiOptions**<`Platform`, `RunTarget`, `Capabilities`\>: { `capabilities`: `Capabilities` ; `platform`: `Platform` ; `runTarget`: `RunTarget`  } & [`RunTargetOptions`](README.md#runtargetoptions)<`Capabilities`\>[`Platform`][`RunTarget`] extends `object` ? { `targetOptions`: [`RunTargetOptions`](README.md#runtargetoptions)<`Capabilities`\>[`Platform`][`RunTarget`]  } : [`RunTargetOptions`](README.md#runtargetoptions)<`Capabilities`\>[`Platform`][`RunTarget`] extends `object` \| `undefined` ? { `targetOptions?`: [`RunTargetOptions`](README.md#runtargetoptions)<`Capabilities`\>[`Platform`][`RunTarget`]  } : { `targetOptions?`: `Record`<`string`, `never`\>  }

The options for the `platformApi()` function.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Platform` | extends [`SupportedPlatform`](README.md#supportedplatform) |
| `RunTarget` | extends [`SupportedRunTarget`](README.md#supportedruntarget)<`Platform`\> |
| `Capabilities` | extends [`SupportedCapability`](README.md#supportedcapability)<`Platform`\>[] |

#### Defined in

[index.ts:427](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L427)

___

### Proxy

Ƭ **Proxy**: `Object`

Connection details for a proxy.

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `host` | `string` | The host of the proxy. |
| `port` | `number` | The port of the proxy. |

#### Defined in

[index.ts:516](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L516)

___

### RunTargetOptions

Ƭ **RunTargetOptions**<`Capabilities`, `Capability`\>: `Object`

The options for a specific platform/run target combination.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Capabilities` | extends [`SupportedCapability`](README.md#supportedcapability)<``"android"`` \| ``"ios"``\>[] |
| `Capability` | `Capabilities`[`number`] |

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `android` | { `device`: `unknown` ; `emulator`: `unknown`  } | The options for the Android platform. |
| `android.device` | `unknown` | The options for the Android physical device run target. |
| `android.emulator` | `unknown` | The options for the Android emulator run target. |
| `ios` | { `device`: ``"ssh"`` extends `Capability` ? { `ip?`: `string` ; `password?`: `string` ; `port?`: `number` ; `username?`: ``"mobile"`` \| ``"root"``  } \| `undefined` : `unknown` ; `emulator`: `never`  } | The options for the iOS platform. |
| `ios.device` | ``"ssh"`` extends `Capability` ? { `ip?`: `string` ; `password?`: `string` ; `port?`: `number` ; `username?`: ``"mobile"`` \| ``"root"``  } \| `undefined` : `unknown` | The options for the iOS physical device run target. |
| `ios.emulator` | `never` | The options for the iOS emulator run target. |

#### Defined in

[index.ts:459](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L459)

___

### SupportedCapability

Ƭ **SupportedCapability**<`Platform`\>: `Platform` extends ``"android"`` ? ``"wireguard"`` \| ``"root"`` \| ``"frida"`` \| ``"certificate-pinning-bypass"`` : `Platform` extends ``"ios"`` ? ``"ssh"`` \| ``"frida"`` \| ``"certificate-pinning-bypass"`` : `never`

A capability for the `platformApi()` function.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Platform` | extends [`SupportedPlatform`](README.md#supportedplatform) |

#### Defined in

[index.ts:497](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L497)

___

### SupportedPlatform

Ƭ **SupportedPlatform**: ``"android"`` \| ``"ios"``

A platform that is supported by this library.

#### Defined in

[index.ts:11](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L11)

___

### SupportedRunTarget

Ƭ **SupportedRunTarget**<`Platform`\>: `Platform` extends ``"android"`` ? ``"emulator"`` \| ``"device"`` : `Platform` extends ``"ios"`` ? ``"device"`` : `never`

A run target that is supported by this library for the given platform.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Platform` | extends [`SupportedPlatform`](README.md#supportedplatform) |

#### Defined in

[index.ts:13](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L13)

___

### WireGuardConfig

Ƭ **WireGuardConfig**: `string`

Configuration string for WireGuard.

#### Defined in

[index.ts:523](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L523)

## Variables

### androidPermissions

• `Const` **androidPermissions**: readonly [``"android.permission.ACCEPT_HANDOVER"``, ``"android.permission.ACCESS_BACKGROUND_LOCATION"``, ``"android.permission.ACCESS_COARSE_LOCATION"``, ``"android.permission.ACCESS_FINE_LOCATION"``, ``"android.permission.ACCESS_LOCATION_EXTRA_COMMANDS"``, ``"android.permission.ACCESS_MEDIA_LOCATION"``, ``"android.permission.ACCESS_NETWORK_STATE"``, ``"android.permission.ACCESS_NOTIFICATION_POLICY"``, ``"android.permission.ACCESS_WIFI_STATE"``, ``"android.permission.ACTIVITY_RECOGNITION"``, ``"android.permission.ANSWER_PHONE_CALLS"``, ``"android.permission.AUTHENTICATE_ACCOUNTS"``, ``"android.permission.BLUETOOTH_ADMIN"``, ``"android.permission.BLUETOOTH_ADVERTISE"``, ``"android.permission.BLUETOOTH_CONNECT"``, ``"android.permission.BLUETOOTH_SCAN"``, ``"android.permission.BLUETOOTH"``, ``"android.permission.BODY_SENSORS_BACKGROUND"``, ``"android.permission.BODY_SENSORS"``, ``"android.permission.BROADCAST_STICKY"``, ``"android.permission.CALL_COMPANION_APP"``, ``"android.permission.CALL_PHONE"``, ``"android.permission.CAMERA"``, ``"android.permission.CHANGE_NETWORK_STATE"``, ``"android.permission.CHANGE_WIFI_MULTICAST_STATE"``, ``"android.permission.CHANGE_WIFI_STATE"``, ``"android.permission.DELIVER_COMPANION_MESSAGES"``, ``"android.permission.DISABLE_KEYGUARD"``, ``"android.permission.EXPAND_STATUS_BAR"``, ``"android.permission.FLASHLIGHT"``, ``"android.permission.FOREGROUND_SERVICE"``, ``"android.permission.GET_ACCOUNTS"``, ``"android.permission.GET_PACKAGE_SIZE"``, ``"android.permission.GET_TASKS"``, ``"android.permission.HIDE_OVERLAY_WINDOWS"``, ``"android.permission.HIGH_SAMPLING_RATE_SENSORS"``, ``"android.permission.INTERNET"``, ``"android.permission.KILL_BACKGROUND_PROCESSES"``, ``"android.permission.MANAGE_ACCOUNTS"``, ``"android.permission.MANAGE_OWN_CALLS"``, ``"android.permission.MODIFY_AUDIO_SETTINGS"``, ``"android.permission.NEARBY_WIFI_DEVICES"``, ``"android.permission.NFC_PREFERRED_PAYMENT_INFO"``, ``"android.permission.NFC_TRANSACTION_EVENT"``, ``"android.permission.NFC"``, ``"android.permission.PERSISTENT_ACTIVITY"``, ``"android.permission.POST_NOTIFICATIONS"``, ``"android.permission.PROCESS_OUTGOING_CALLS"``, ``"android.permission.QUERY_ALL_PACKAGES"``, ``"android.permission.READ_BASIC_PHONE_STATE"``, ``"android.permission.READ_CALENDAR"``, ``"android.permission.READ_CALL_LOG"``, ``"android.permission.READ_CELL_BROADCASTS"``, ``"android.permission.READ_CONTACTS"``, ``"android.permission.READ_EXTERNAL_STORAGE"``, ``"android.permission.READ_INSTALL_SESSIONS"``, ``"android.permission.READ_MEDIA_AUDIO"``, ``"android.permission.READ_MEDIA_IMAGES"``, ``"android.permission.READ_MEDIA_VIDEO"``, ``"android.permission.READ_NEARBY_STREAMING_POLICY"``, ``"android.permission.READ_PHONE_NUMBERS"``, ``"android.permission.READ_PHONE_STATE"``, ``"android.permission.READ_PROFILE"``, ``"android.permission.READ_SMS"``, ``"android.permission.READ_SOCIAL_STREAM"``, ``"android.permission.READ_SYNC_SETTINGS"``, ``"android.permission.READ_SYNC_STATS"``, ``"android.permission.READ_USER_DICTIONARY"``, ``"android.permission.RECEIVE_BOOT_COMPLETED"``, ``"android.permission.RECEIVE_MMS"``, ``"android.permission.RECEIVE_SMS"``, ``"android.permission.RECEIVE_WAP_PUSH"``, ``"android.permission.RECORD_AUDIO"``, ``"android.permission.REORDER_TASKS"``, ``"android.permission.REQUEST_COMPANION_PROFILE_WATCH"``, ``"android.permission.REQUEST_COMPANION_RUN_IN_BACKGROUND"``, ``"android.permission.REQUEST_COMPANION_START_FOREGROUND_SERVICES_FROM_BACKGROUND"``, ``"android.permission.REQUEST_COMPANION_USE_DATA_IN_BACKGROUND"``, ``"android.permission.REQUEST_DELETE_PACKAGES"``, ``"android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"``, ``"android.permission.REQUEST_OBSERVE_COMPANION_DEVICE_PRESENCE"``, ``"android.permission.REQUEST_PASSWORD_COMPLEXITY"``, ``"android.permission.RESTART_PACKAGES"``, ``"android.permission.SCHEDULE_EXACT_ALARM"``, ``"android.permission.SEND_SMS"``, ``"android.permission.SET_WALLPAPER_HINTS"``, ``"android.permission.SET_WALLPAPER"``, ``"android.permission.SUBSCRIBED_FEEDS_READ"``, ``"android.permission.SUBSCRIBED_FEEDS_WRITE"``, ``"android.permission.TRANSMIT_IR"``, ``"android.permission.UPDATE_PACKAGES_WITHOUT_USER_ACTION"``, ``"android.permission.USE_BIOMETRIC"``, ``"android.permission.USE_CREDENTIALS"``, ``"android.permission.USE_EXACT_ALARM"``, ``"android.permission.USE_FINGERPRINT"``, ``"android.permission.USE_FULL_SCREEN_INTENT"``, ``"android.permission.USE_SIP"``, ``"android.permission.UWB_RANGING"``, ``"android.permission.VIBRATE"``, ``"android.permission.WAKE_LOCK"``, ``"android.permission.WRITE_CALENDAR"``, ``"android.permission.WRITE_CALL_LOG"``, ``"android.permission.WRITE_CONTACTS"``, ``"android.permission.WRITE_EXTERNAL_STORAGE"``, ``"android.permission.WRITE_PROFILE"``, ``"android.permission.WRITE_SMS"``, ``"android.permission.WRITE_SOCIAL_STREAM"``, ``"android.permission.WRITE_SYNC_SETTINGS"``, ``"android.permission.WRITE_USER_DICTIONARY"``, ``"com.android.alarm.permission.SET_ALARM"``, ``"com.android.browser.permission.READ_HISTORY_BOOKMARKS"``, ``"com.android.browser.permission.WRITE_HISTORY_BOOKMARKS"``, ``"com.android.launcher.permission.INSTALL_SHORTCUT"``, ``"com.android.launcher.permission.UNINSTALL_SHORTCUT"``, ``"com.android.voicemail.permission.ADD_VOICEMAIL"``, ``"com.google.android.gms.dck.permission.DIGITAL_KEY_READ"``, ``"com.google.android.gms.dck.permission.DIGITAL_KEY_WRITE"``, ``"com.google.android.gms.permission.ACTIVITY_RECOGNITION"``, ``"com.google.android.gms.permission.AD_ID_NOTIFICATION"``, ``"com.google.android.gms.permission.AD_ID"``, ``"com.google.android.gms.permission.CAR_FUEL"``, ``"com.google.android.gms.permission.CAR_MILEAGE"``, ``"com.google.android.gms.permission.CAR_SPEED"``, ``"com.google.android.gms.permission.CAR_VENDOR_EXTENSION"``, ``"com.google.android.gms.permission.REQUEST_SCREEN_LOCK_COMPLEXITY"``, ``"com.google.android.gms.permission.TRANSFER_WIFI_CREDENTIAL"``, ``"com.google.android.ims.providers.ACCESS_DATA"``, ``"com.google.android.providers.gsf.permission.READ_GSERVICES"``]

The IDs of known permissions on Android.

#### Defined in

[android.ts:1006](https://github.com/tweaselORG/appstraction/blob/main/src/android.ts#L1006)

___

### iosPermissions

• `Const` **iosPermissions**: readonly [``"kTCCServiceLiverpool"``, ``"kTCCServiceUbiquity"``, ``"kTCCServiceCalendar"``, ``"kTCCServiceAddressBook"``, ``"kTCCServiceReminders"``, ``"kTCCServicePhotos"``, ``"kTCCServiceMediaLibrary"``, ``"kTCCServiceBluetoothAlways"``, ``"kTCCServiceMotion"``, ``"kTCCServiceWillow"``, ``"kTCCServiceExposureNotification"``, ``"kTCCServiceCamera"``, ``"kTCCServiceMicrophone"``, ``"kTCCServiceUserTracking"``]

The IDs of known permissions on iOS.

#### Defined in

[ios.ts:645](https://github.com/tweaselORG/appstraction/blob/main/src/ios.ts#L645)

## Functions

### listDevices

▸ **listDevices**(`options?`): `Promise`<{ `id`: `string` ; `name?`: `string` ; `platform`: ``"android"`` \| ``"ios"``  }[]\>

Returns a list of all detected Android and iOS devices currently connected to the host. This includes Android
emulators running on the host.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options?` | `Object` | If the `frida` option is set to `true`, this function will use frida to detect the devices rather than try to detect them using platform-specific tools (such as `adb` and `pymobiledevice3`). |
| `options.frida?` | `boolean` | - |

#### Returns

`Promise`<{ `id`: `string` ; `name?`: `string` ; `platform`: ``"android"`` \| ``"ios"``  }[]\>

#### Defined in

[util.ts:392](https://github.com/tweaselORG/appstraction/blob/main/src/util.ts#L392)

___

### parseAppMeta

▸ **parseAppMeta**<`Platform`\>(`appPath`, `_platform?`): `Promise`<`undefined` \| [`AppMeta`](README.md#appmeta)\>

Get metadata about the app at the given path.

**`Remarks`**

If you pass multiple APKs from different apps, no error will be raised. The metadata for the first app will be
returned.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Platform` | extends [`SupportedPlatform`](README.md#supportedplatform) |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `appPath` | [`AppPath`](README.md#apppath)<`Platform`\> | Path to the app file (`.ipa` on iOS, `.apk` on Android) to get the metadata of. On Android, this can also be an array of the paths of the split APKs of a single app or the following custom APK bundle formats: `.xapk`, `.apkm` and `.apks`. |
| `_platform?` | `Platform` | - |

#### Returns

`Promise`<`undefined` \| [`AppMeta`](README.md#appmeta)\>

An object containing the parsed metadata, or `undefined` if the file doesn't exist or is not a valid app for
  the platform.

#### Defined in

[util.ts:71](https://github.com/tweaselORG/appstraction/blob/main/src/util.ts#L71)

___

### pause

▸ **pause**(`durationInMs`, `abortSignal?`): `Promise`<`undefined`\>

Pause for a given duration.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `durationInMs` | `number` | The duration to pause for, in milliseconds. |
| `abortSignal?` | `AbortSignal` | Provide a signal to abort the pause. |

#### Returns

`Promise`<`undefined`\>

#### Defined in

[util.ts:54](https://github.com/tweaselORG/appstraction/blob/main/src/util.ts#L54)

___

### platformApi

▸ **platformApi**<`Platform`, `RunTarget`, `Capabilities`\>(`options`): [`PlatformApi`](README.md#platformapi)<`Platform`, `RunTarget`, `Capabilities`\>

Get the API object with the functions for the given platform and run target.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `Platform` | extends [`SupportedPlatform`](README.md#supportedplatform) |
| `RunTarget` | extends ``"emulator"`` \| ``"device"`` |
| `Capabilities` | extends [`SupportedCapability`](README.md#supportedcapability)<`Platform`\>[] |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | [`PlatformApiOptions`](README.md#platformapioptions)<`Platform`, `RunTarget`, `Capabilities`\> | The options for the API object. |

#### Returns

[`PlatformApi`](README.md#platformapi)<`Platform`, `RunTarget`, `Capabilities`\>

The API object for the given platform and run target.

#### Defined in

[index.ts:552](https://github.com/tweaselORG/appstraction/blob/main/src/index.ts#L552)
