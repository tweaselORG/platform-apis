import type { runAndroidDevTool } from 'andromatic';
import type { SSHExecCommandOptions, SSHExecCommandResponse } from 'node-ssh';
import type { LiteralUnion } from 'type-fest';
import type { AndroidPermission } from './android';
import { androidApi } from './android';
import type { IosPermission } from './ios';
import { iosApi } from './ios';
import type { ParametersExceptFirst } from './util';

/** A platform that is supported by this library. */
export type SupportedPlatform = 'android' | 'ios';
/** A run target that is supported by this library for the given platform. */
export type SupportedRunTarget<Platform extends SupportedPlatform> = Platform extends 'android'
    ? 'emulator' | 'device'
    : Platform extends 'ios'
    ? 'device'
    : never;
/**
 * On Android, the path to a single APK with the `.apk` extension, an array of paths to split APKs with the `.apk`
 * extension, the path to an XAPK file with the `.xapk` extension or the path to either an `.apkm` or `.apks` file.
 *
 * On iOS, the path to an IPA file with the `.ipa` extension.
 */
export type AppPath<Platform extends SupportedPlatform> = Platform extends 'android'
    ? `${string}.apk` | `${string}.xapk` | `${string}.apkm` | `${string}.apks` | `${string}.apk`[]
    : `${string}.ipa`;

/** An object that describes how an Android extension file (`.obb`) should be installed on the device. */
export type ObbInstallSpec = {
    /** Path to the obb on the host. */
    obb: `${string}.obb`;
    /**
     * Path in relation to `$EXTERNAL_STORAGE` in which to install the obb on the guest. Will be the default app folder
     * (`$EXTERNAL_STORAGE/Android/obb/<app id>/<file name on host>`) if nothing is specified.
     */
    installPath?: `${string}.obb`;
};

/** Metadata about an app, as returned by {@link parseAppMeta}. */
export type AppMeta = {
    /** The platform the app is for. */
    platform: SupportedPlatform;
    /** The app/bundle ID. */
    id: string;
    /** The app's display name. */
    name?: string;
    /** The app's human-readable version. */
    version?: string;
    /** The app's version code. */
    versionCode?: string;
    /**
     * A list of the architectures that the app supports. The identifiers for the architectures are normalized across
     * Android and iOS.
     *
     * On Android, this will be empty for apps that don't have native code.
     */
    architectures: ('arm64' | 'arm' | 'x86' | 'x86_64' | 'mips' | 'mips64')[];
    /**
     * The MD5 hash of the app's package file.
     *
     * In the case of split APKs on Android, this will be the hash of the main APK. In the case of custom APK bundle
     * formats (`.xapk`, `.apkm` and `.apks`), this will be the hash of the entire bundle.
     *
     * **Be careful when interpreting this value.** App stores can deliver different distributions of the exact same
     * app. For example, apps downloaded from the App Store on iOS include the user's Apple ID, thus leading to
     * different hashes even if different users download the very same version of the same app.
     */
    md5?: string;
};

/** Functions that are available for the platforms. */
export type PlatformApi<
    Platform extends SupportedPlatform,
    RunTarget extends SupportedRunTarget<Platform>,
    Capabilities extends SupportedCapability<'android' | 'ios'>[],
    Capability = Capabilities[number]
> = {
    /**
     * Wait until the device or emulator has been connected and has booted up completely.
     *
     * @param tries The number of times to check if the device is present and booted. On Android, one try times out
     *   after 7 seconds and the default number of tries is 20. On iOS, one try times out after 10 seconds and the
     *   default number of tries is 20.
     * @param options.abortSignal Pass an AbortSignal to abort the waiting in case of a crash. This might not be
     *   graceful.
     */
    waitForDevice: (tries?: number, options?: { abortSignal?: AbortSignal }) => Promise<void>;
    /**
     * Assert that the selected device is connected and ready to be used with the selected capabilities, performing
     * necessary setup steps. This should always be the first function you call.
     *
     * Note that depending on the capabilities you set, the setup steps may make permanent changes to your device.
     *
     * For Android, you can set the url to the WireGuard APK which should be installed in the `WIREGUARD_APK_URL`
     * environment variable. Note that it is only used if WireGuard isn’t installed already.
     *
     * @param options.abortSignal Pass an AbortSignal to abort the waiting in case of a crash. This might not be
     *   graceful.
     */
    ensureDevice: (options?: { abortSignal?: AbortSignal }) => Promise<void>;
    /**
     * Reset the device to the specified snapshot (only available for emulators).
     *
     * @param snapshotName The name of the snapshot to reset to.
     * @param options.abortSignal Pass an AbortSignal to abort the waiting in case of a crash. This might not be
     *   graceful.
     */
    resetDevice: Platform extends 'android'
        ? RunTarget extends 'emulator'
            ? (snapshotName: string, options?: { abortSignal?: AbortSignal }) => Promise<void>
            : never
        : never;
    /**
     * Save the device state to the specified snapshot (only available for emulators).
     *
     * @param snapshotName The name of the snapshot to save to.
     * @param options.abortSignal Pass an AbortSignal to abort the waiting in case of a crash. This might not be
     *   graceful.
     */
    snapshotDeviceState: Platform extends 'android'
        ? RunTarget extends 'emulator'
            ? (snapshotName: string, options?: { abortSignal?: AbortSignal }) => Promise<void>
            : never
        : never;
    /**
     * Clear any potential stuck modals by pressing the back button followed by the home button.
     *
     * This is currently broken on iOS (see https://github.com/tweaselORG/appstraction/issues/12).
     *
     * Requires the `ssh` capability on iOS.
     */
    clearStuckModals: Platform extends 'android' ? () => Promise<void> : never;

    /**
     * Get a list of the app IDs of all installed apps.
     *
     * @param options.includeSystem Whether to include system apps in the list. Defaults to `false`.
     *
     * @returns An array of the app IDs.
     */
    listApps: (options?: { includeSystem?: boolean }) => Promise<string[]>;
    /**
     * Check whether the app with the given app ID is installed.
     *
     * @param appId The app ID of the app to check.
     *
     * @returns Whether the app is installed.
     */
    isAppInstalled: (appId: string) => Promise<boolean>;
    /**
     * Install the app at the given path.
     *
     * @param appPath Path to the app file (`.ipa` on iOS, `.apk` on Android) to install. On Android, this can also be
     *   an array of the paths of the split APKs of a single app or the following custom APK bundle formats: `.xapk`,
     *   `.apkm` and `.apks`. Might require the `root` capability to install extension files in XAPKs.
     */
    installApp: (
        appPath: AppPath<Platform>,
        obbPaths?: Platform extends 'android' ? ObbInstallSpec[] : never
    ) => Promise<void>;
    /**
     * Uninstall the app with the given app ID. Will not fail if the app is not installed.
     *
     * This also removes any data stored by the app.
     *
     * @param appId The app ID of the app to uninstall.
     */
    uninstallApp: (appId: string) => Promise<void>;
    /**
     * Set the permissions for the app with the given app ID. By default, it will grant all known permissions (including
     * dangerous permissions on Android) and set the location permission on iOS to `always`. You can specify which
     * permissions to grant/deny using the `permissions` argument.
     *
     * Requires the `ssh` and `frida` capabilities on iOS.
     *
     * @param appId The app ID of the app to set the permissions for.
     * @param permissions The permissions to set as an object mapping from permission ID to whether to grant it (`allow`
     *   to grant the permission, `deny` to deny it, `unset` to remove the permission from the permissions table). If
     *   not specified, all permissions will be set to `allow`.
     *
     *   On iOS, in addition to the actual permission IDs, you can also use `location` to set the location permission.
     *   Here, the possible values are `ask` (ask every time), `never`, `always`, and `while-using` (while using the
     *   app).
     */
    setAppPermissions: (
        appId: string,
        permissions?: Platform extends 'ios'
            ? { [p in IosPermission]?: 'unset' | 'allow' | 'deny' } & {
                  location?: 'ask' | 'never' | 'always' | 'while-using';
              }
            : Partial<Record<LiteralUnion<AndroidPermission, string>, 'allow' | 'deny'>>
    ) => Promise<void>;
    /**
     * Configure whether the app's background battery usage should be restricted.
     *
     * Currently only supported on Android.
     *
     * @param appId The app ID of the app to configure the background battery usage settings for.
     * @param state The state to set the background battery usage to.
     *
     *   On Android, the possible values are:
     *
     *   - `unrestricted`: "Allow battery usage in background without restrictions. May use more battery."
     *   - `optimized`: "Optimize based on your usage. Recommended for most apps." (default after installation)
     *   - `restricted`: "Restrict battery usage while in background. Apps may not work as expected. Notifications may be
     *       delayed."
     */
    setAppBackgroundBatteryUsage: Platform extends 'android'
        ? (appId: string, state: 'unrestricted' | 'optimized' | 'restricted') => Promise<void>
        : never;
    /**
     * Start the app with the given app ID. Doesn't wait for the app to be ready. Also enables the certificate pinning
     * bypass if enabled.
     *
     * Requires the `frida` or `ssh` capability on iOS. On Android, this will start the app with or without a
     * certificate pinning bypass depending on the `certificate-pinning-bypass` capability.
     *
     * @param appId The app ID of the app to start.
     */
    startApp: (appId: string) => Promise<void>;
    /**
     * Force-stop the app with the given app ID.
     *
     * @param appId The app ID of the app to stop.
     */
    stopApp: (appId: string) => Promise<void>;

    /**
     * Get the app ID of the running app that is currently in the foreground.
     *
     * Requires the `frida` capability on iOS.
     *
     * @returns The app ID of the app that is currently in the foreground, or `undefined` if no app is in the
     *   foreground.
     */
    getForegroundAppId: () => Promise<string | undefined>;
    /**
     * Get the PID of the app with the given app ID if it is currently running.
     *
     * Requires the `frida` capability on iOS.
     *
     * @param appId The app ID of the app to get the PID for.
     *
     * @returns The PID of the app if it is currently running, or `undefined` if the app is not running.
     */
    getPidForAppId: (appId: string) => Promise<number | undefined>;
    /**
     * Get the preferences (`SharedPreferences` on Android, `NSUserDefaults` on iOS) of the app with the given app ID.
     *
     * Requires the `frida` capability on Android and iOS.
     *
     * @param appId The app ID of the app to get the preferences for.
     *
     * @returns The preferences of the app, or `undefined` if the app is not installed.
     */
    getPrefs: (appId: string) => Promise<Record<string, unknown> | undefined>;
    /**
     * Get the value of the given device attribute.
     *
     * @param attribute The attribute to get the value of, where:
     *
     *   - `apiLevel`: [Android SDK API level](https://developer.android.com/tools/releases/platforms) (Android only)
     *   - `architectures`: architectures/ABIs supported by the device (comma-separated list)
     *   - `idfv`: `identifierForVendor` for the app given in `options` (iOS only). Requires the `frida` capability.
     *   - `manufacturer`: device manufacturer.
     *   - `model`: device model.
     *   - `modelCodeName`: code name/identifier for the device model.
     *   - `name`: device name.
     *   - `osBuild`: operating system build string.
     *   - `osVersion`: operating system version.
     *
     * @param options Some attributes require additional options:
     *
     *   - `idfv`: The app ID of the app to get the `identifierForVendor` for.
     *
     * @returns
     */
    getDeviceAttribute: <Attribute extends DeviceAttribute<Platform>>(
        attribute: Attribute,
        ...options: Attribute extends keyof GetDeviceAttributeOptions
            ? [options: GetDeviceAttributeOptions[Attribute]]
            : [options?: undefined]
    ) => Promise<string>;
    /**
     * Set the clipboard to the given text.
     *
     * Requires the `frida` capability on Android and iOS.
     *
     * @param text The text to set the clipboard to.
     */
    setClipboard: (text: string) => Promise<void>;

    /**
     * Install the certificate authority with the given path as a trusted CA on the device. This allows you to intercept
     * and modify traffic from apps on the device.
     *
     * On Android, this installs the CA as a system CA. As this is normally not possible on Android 10 and above, it
     * overlays the `/system/etc/security/cacerts` directory with a tmpfs and installs the CA there. This means that the
     * changes are not persistent across reboots.
     *
     * On iOS, the CA is installed permanently as a root certificate in the Certificate Trust Store. It persists across
     * reboots.\
     * **Currently, you need to manually trust any CA at least once on the device, CAs can be added but not
     * automatically marked as trusted (see:
     * https://github.com/tweaselORG/appstraction/issues/44#issuecomment-1466151197).**
     *
     * Requires the `root` capability on Android, and the `ssh` capability on iOS.
     *
     * @param path The path to the certificate authority to install. The certificate must be in PEM format.
     */
    installCertificateAuthority: (path: string) => Promise<void>;
    /**
     * Remove the certificate authority with the given path from the trusted CAs on the device.
     *
     * On Android, this works for system CAs, including those pre-installed with the OS. As this is normally not
     * possible on Android 10 and above, it overlays the `/system/etc/security/cacerts` directory with a tmpfs and
     * removes the CA there. This means that the changes are not persistent across reboots.
     *
     * On iOS, this only works for CAs in the Certificate Trust Store. It does not work for pre-installed OS CAs. The
     * changes are persistent across reboots.
     *
     * Requires the `root` capability on Android, and the `ssh` capability on iOS.
     *
     * @param path The path to the certificate authority to remove. The certificate must be in PEM format.
     */
    removeCertificateAuthority: (path: string) => Promise<void>;
    /**
     * Set or disable the proxy on the device. If you have enabled the `wireguard` capability, this will start or stop a
     * WireGuard tunnel. Otherwise, it will set the global proxy on the device.
     *
     * On iOS, the proxy is set for the current WiFi network. It won't apply for other networks or for cellular data
     * connections.
     *
     * WireGuard is currently only supported on Android. Enabling a WireGuard tunnel requires the `root` capability.
     *
     * @remarks
     * The WireGuard integration will create a new tunnel in the app called `appstraction` and delete it when the proxy
     * is stopped. If you have an existing tunnel with the same name, it will be overridden.
     * @param proxy The proxy to set, or `null` to disable the proxy. If you have enabled the `wireguard` capability,
     *   this is a string of the full WireGuard configuration to use.
     */
    setProxy: Platform extends 'android'
        ? (proxy: ('wireguard' extends Capability ? WireGuardConfig : Proxy) | null) => Promise<void>
        : Platform extends 'ios'
        ? (proxy: Proxy | null) => Promise<void>
        : never;
    /**
     * Adds a simple event to the device’s calendar. Requires the `frida` capability.
     *
     * On Android, this currently only works if a calendar has already been set up.
     *
     * @param eventData The event to add.
     */
    addCalendarEvent: (eventData: CalendarEventData) => Promise<void>;
    /**
     * Add a contact to the device’s contact book. Requires the `frida` capability.
     *
     * On Android, this currently only works if `com.android.contacts` is installed.
     *
     * @param contactData The contact to add.
     */
    addContact: (contactData: ContactData) => Promise<void>;
    /**
     * Sets the name of the device, which shows up to other network or bluetooth devices.
     *
     * @param deviceName The new name for the device.
     */
    setDeviceName: (deviceName: string) => Promise<void>;
    /**
     * An indicator for what platform and run target this instance of PlatformApi is configured for. This is useful
     * mostly to write typeguards.
     */
    readonly target: {
        /** The platform this instance is configured for, i.e. `ios` or `android`. */
        platform: Platform;
        /** The run target this instance is configured for, i.e. `device` or `emulator`. */
        runTarget: RunTarget;
    };
    /** @ignore */
    _internal: Platform extends 'android'
        ? {
              hasDeviceBooted: (options?: { waitForDevice?: boolean; abortSignal?: AbortSignal }) => Promise<boolean>;
              ensureFrida: () => Promise<void>;
              requireRoot: (action: string) => Promise<{
                  adbRootShell: AdbRootFunction;
                  adbRootPush: (source: string, destination: string) => Promise<void>;
              }>;
              ensureAdb: (options?: { abortSignal?: AbortSignal }) => Promise<void>;

              getCertificateSubjectHashOld: (path: string) => Promise<string | undefined>;
              hasCertificateAuthority: (filename: string) => Promise<boolean>;
              overlayTmpfs: (directoryPathWithoutLeadingSlash: string) => Promise<void>;

              isVpnEnabled: () => Promise<boolean>;
              installMultiApk: (apks: string[]) => Promise<string>;
          }
        : Platform extends 'ios'
        ? {
              ssh: (
                  command: string[],
                  options?: {
                      nodeSSHOptions?: SSHExecCommandOptions;
                      reject?: boolean;
                  }
              ) => Promise<SSHExecCommandResponse>;
              /**
               * Will install and set up the necessary dependencies on the device for the chosen capability. This
               * includes e.g. the frida-server or SSL Kill Switch 2. It will make persistent changes to the device and
               * add the repositiory servers to the device's sources list. They will be contacted regularly to check for
               * updates, so be sure of the privacy implications of this.
               */
              setupEnvironment: () => Promise<void>;
              ensureFrida: () => Promise<void>;
          }
        : never;
};

export type AdbRootFunction = (
    command: ParametersExceptFirst<typeof runAndroidDevTool>[0],
    options?: {
        adbShellFlags?: string[];
        execaOptions?: ParametersExceptFirst<typeof runAndroidDevTool>[1];
    }
) => ReturnType<typeof runAndroidDevTool>;

/** The options for the `platformApi()` function. */
export type PlatformApiOptions<
    Platform extends SupportedPlatform,
    RunTarget extends SupportedRunTarget<Platform>,
    Capabilities extends SupportedCapability<Platform>[]
> = {
    /** The platform you want to run on. */
    platform: Platform;
    /** The target (emulator, physical device) you want to run on. */
    runTarget: RunTarget;
    /**
     * The capabilities you want. Depending on what you're trying to do, you may not need or want to root the device,
     * install Frida, etc. In this case, you can exclude those capabilities. This will influence which functions you can
     * run.
     */
    capabilities: Capabilities;
} & (RunTargetOptions<Capabilities>[Platform][RunTarget] extends object
    ? {
          /** The options for the selected platform/run target combination. */
          targetOptions: RunTargetOptions<Capabilities>[Platform][RunTarget];
      }
    : RunTargetOptions<Capabilities>[Platform][RunTarget] extends object | undefined
    ? {
          /** The options for the selected platform/run target combination. */
          targetOptions?: RunTargetOptions<Capabilities>[Platform][RunTarget];
      }
    : {
          /** The options for the selected platform/run target combination. */
          targetOptions?: Record<string, never>;
      });

/** The options for a specific platform/run target combination. */
// Use `unknown` here to mean "no options", and `never` to mean "not supported".
export type RunTargetOptions<
    Capabilities extends SupportedCapability<'android' | 'ios'>[],
    Capability = Capabilities[number]
> = {
    /** The options for the Android platform. */
    android: {
        /** The options for the Android emulator run target. */
        emulator: unknown;
        /** The options for the Android physical device run target. */
        device: unknown;
    };
    /** The options for the iOS platform. */
    ios: {
        /** The options for the iOS emulator run target. */
        emulator: never;
        /** The options for the iOS physical device run target. */
        device: 'ssh' extends Capability
            ?
                  | {
                        /**
                         * The username to use when logging into the device. Make sure the user is set up for login via
                         * SSH. If the `mobile` user is chosen, all commands are prepended with sudo. Defaults to
                         * `mobile`
                         */
                        username?: 'mobile' | 'root';
                        /** The password of the user to log into the device, defaults to `alpine` if not set. */
                        password?: string;
                        /** The device's IP address. If none is given, a connection via USB port forwarding is attempted. */
                        ip?: string;
                        /** The port where the SSH server is running on the device. Defaults to 22. */
                        port?: number;
                    }
                  | undefined
            : unknown;
    };
};

/** A capability for the `platformApi()` function. */
export type SupportedCapability<Platform extends SupportedPlatform> = Platform extends 'android'
    ? 'wireguard' | 'root' | 'frida' | 'certificate-pinning-bypass'
    : Platform extends 'ios'
    ? 'ssh' | 'frida' | 'certificate-pinning-bypass'
    : never;

/** A supported attribute for the `getDeviceAttribute()` function, depending on the platform. */
export type DeviceAttribute<Platform extends SupportedPlatform> = Platform extends 'android'
    ? 'apiLevel' | 'architectures' | 'manufacturer' | 'model' | 'modelCodeName' | 'name' | 'osBuild' | 'osVersion'
    : 'architectures' | 'idfv' | 'manufacturer' | 'modelCodeName' | 'name' | 'osBuild' | 'osVersion';
/** The options for each attribute available through the `getDeviceAttribute()` function. */
export type GetDeviceAttributeOptions = {
    /** The options for the `idfv` attribute. */
    idfv: {
        /** The app ID of the app to get the `identifierForVendor` for. */
        appId: string;
    };
};
/** Connection details for a proxy. */
export type Proxy = {
    /** The host of the proxy. */
    host: string;
    /** The port of the proxy. */
    port: number;
};
/** Configuration string for WireGuard. */
export type WireGuardConfig = string;
/** Event to add to the device’s calendar. */
export type CalendarEventData = {
    /** Title of the event. */
    title: string;
    /** Date and time when the event should start. */
    startDate: Date;
    /** Date and time when the event should end. */
    endDate: Date;
};
/** Contact to add to the device’s contacts. */
export type ContactData = {
    /** Last name of the contact to add. */
    lastName: string;
    /** First name of the contact to add. */
    firstName?: string;
    /** Phone number of the contact. Will be added as ‘Home’. */
    phoneNumber?: string;
    /** Email address of the contact. Will be added as ‘Home’. */
    email?: string;
};

/**
 * Get the API object with the functions for the given platform and run target.
 *
 * @param options The options for the API object.
 *
 * @returns The API object for the given platform and run target.
 */
export function platformApi<
    Platform extends SupportedPlatform,
    RunTarget extends SupportedRunTarget<Platform>,
    Capabilities extends SupportedCapability<Platform>[]
>(options: PlatformApiOptions<Platform, RunTarget, Capabilities>): PlatformApi<Platform, RunTarget, Capabilities> {
    switch (options.platform) {
        case 'android':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return androidApi(options as any) as any;
        case 'ios':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return iosApi(options as any) as any;
        default:
            throw new Error(`Unsupported platform: ${options.platform}`);
    }
}

export { androidPermissions } from './android';
export { iosPermissions } from './ios';
export { listDevices, parseAppMeta, pause } from './util';
export { appstractionVersion } from './version.gen';
export { IosPermission, AndroidPermission };
