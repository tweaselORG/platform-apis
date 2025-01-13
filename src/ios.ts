import { getVenv } from 'autopy';
import { createHash } from 'crypto';
import frida from 'frida';
import { NodeSSH } from 'node-ssh';
import type { ContactData, PlatformApi, PlatformApiOptions, Proxy, SupportedCapability, SupportedRunTarget } from '.';
import { venvOptions } from '../scripts/common/python';
import {
    asyncUnimplemented,
    escapeCommand,
    getObjFromFridaScript,
    isRecord,
    listDevices,
    parsePemCertificateFromFile,
    pause,
    retryCondition,
    startUsbmuxProxy,
} from './util';

const venv = getVenv(venvOptions);
const python = async (...args: Parameters<Awaited<typeof venv>>) => (await venv)(...args);

const fridaScripts = {
    getPrefs: `// Taken from: https://codeshare.frida.re/@dki/ios-app-info/
function dictFromNSDictionary(nsDict) {
    var jsDict = {};
    var keys = nsDict.allKeys();
    var count = keys.count();
    for (var i = 0; i < count; i++) {
        var key = keys.objectAtIndex_(i);
        var value = nsDict.objectForKey_(key);
        jsDict[key.toString()] = value.toString();
    }

    return jsDict;
}
var prefs = ObjC.classes.NSUserDefaults.alloc().init().dictionaryRepresentation();
send({ name: "get_obj_from_frida_script", payload: dictFromNSDictionary(prefs) });`,
    setClipboard: (text: string) => `ObjC.classes.UIPasteboard.generalPasteboard().setString_("${text}");`,
    getIdfv: `var idfv = ObjC.classes.UIDevice.currentDevice().identifierForVendor().toString();
send({ name: "get_obj_from_frida_script", payload: idfv });`,
    grantLocationPermission: (appId: string, value: 0 | 2 | 3 | 4) =>
        `ObjC.classes.CLLocationManager.setAuthorizationStatusByType_forBundleIdentifier_(${value}, "${appId}");`,
    startApp: (appId: string) =>
        `ObjC.classes.LSApplicationWorkspace.defaultWorkspace().openApplicationWithBundleID_("${appId}");`,
    /**
     * @param options If `options` is falsy, the proxy will be disabled. Otherwise, it will be set according to the
     *   properties and enabled. If both `options.username` and `options.password` are provided, the proxy will be
     *   configured to use authentication.
     */
    setProxy: (options: Proxy | null) => `function setProxySettingsForCurrentWifiNetwork(options) {
    var NSString = ObjC.classes.NSString;
    var NSNumber = ObjC.classes.NSNumber;

    var authenticated = options && options.username && options.password;

    var defaultProxySettings = ObjC.classes.WFSettingsProxy.defaultProxyConfiguration();

    // Sometimes, currentNetwork() returns null, so we have to try a few times.
    // See: https://github.com/tweaselORG/appstraction/issues/25#issuecomment-1447996021
    var ssid;
    for (let i = 0; i < 100; i++) {
        var currentNetwork = ObjC.classes.WFClient.sharedInstance().interface().currentNetwork();
        if (currentNetwork) {
            ssid = currentNetwork.ssid();
            break;
        }
    }

    var newSettingsDict = ObjC.classes.NSMutableDictionary.alloc().initWithDictionary_(defaultProxySettings);
    if (options) {
        newSettingsDict.setObject_forKey_(NSNumber.numberWithInt_(1), NSString.stringWithString_('HTTPEnable'));
        newSettingsDict.setObject_forKey_(NSNumber.numberWithInt_(options.port), NSString.stringWithString_('HTTPPort'));
        newSettingsDict.setObject_forKey_(NSString.stringWithString_(options.host), NSString.stringWithString_('HTTPProxy'));
        newSettingsDict.setObject_forKey_(NSNumber.numberWithInt_(1), NSString.stringWithString_('HTTPSEnable'));
        newSettingsDict.setObject_forKey_(NSNumber.numberWithInt_(options.port), NSString.stringWithString_('HTTPSPort'));
        newSettingsDict.setObject_forKey_(NSString.stringWithString_(options.host), NSString.stringWithString_('HTTPSProxy'));

        if (authenticated) {
            newSettingsDict.setObject_forKey_(NSNumber.numberWithInt_(1), NSString.stringWithString_('HTTPProxyAuthenticated'));
            newSettingsDict.setObject_forKey_(NSString.stringWithString_(options.username), NSString.stringWithString_('HTTPProxyUsername'));
        }
    }

    var newSettings = ObjC.classes.WFSettingsProxy.alloc().initWithDictionary_(newSettingsDict);
    if (authenticated) newSettings.setPassword_(options.password);

    var arrayWithNewSettings = ObjC.classes.NSMutableArray.alloc().init();
    arrayWithNewSettings.addObject_(newSettings);

    var saveSettingsOperation = ObjC.classes.WFSaveSettingsOperation.alloc().initWithSSID_settings_(ssid, arrayWithNewSettings);
    saveSettingsOperation.setCurrentNetwork_(1);
    saveSettingsOperation.start();
}

setProxySettingsForCurrentWifiNetwork(${JSON.stringify(options)});`,
    getProxy: `// Taken from: https://codeshare.frida.re/@dki/ios-app-info/
function dictFromNSDictionary(nsDict) {
    var jsDict = {};
    var keys = nsDict.allKeys();
    var count = keys.count();
    for (var i = 0; i < count; i++) {
        var key = keys.objectAtIndex_(i);
        var value = nsDict.objectForKey_(key);
        jsDict[key.toString()] = value.toString();
    }

    return jsDict;
}

function getProxySettingsForCurrentWifiNetwork() {
    var ssid;
    for (let i = 0; i < 100; i++) {
        var currentNetwork = ObjC.classes.WFClient.sharedInstance().interface().currentNetwork();
        if (currentNetwork) {
            ssid = currentNetwork.ssid();
            break;
        }
    }

    var gso = ObjC.classes.WFGetSettingsOperation.alloc().initWithSSID_(ssid);
    gso.start();
    var settings = gso.settings().proxySettings();

    var dict = dictFromNSDictionary(settings.items());
    if (settings.password()) dict.HTTPProxyPassword = settings.password().toString();

    return dict;
}

send({ name: "get_obj_from_frida_script", payload: getProxySettingsForCurrentWifiNetwork() });`,
    addCalendarEvent: (eventData: {
        title: string;
        startDate: string;
        endDate: string;
    }) => `function addCalendarEvent(eventData) {
    const eventStore = ObjC.classes.EKEventStore.alloc().init();
    const NSError = ObjC.classes.NSError;
    const NSISO8601DateFormatter = ObjC.classes.NSISO8601DateFormatter;
    const NSString = ObjC.classes.NSString;
    const EKEvent = ObjC.classes.EKEvent;

    const formatter = NSISO8601DateFormatter.alloc().init();

    const evt = EKEvent.eventWithEventStore_(eventStore);
    evt.setTitle_(NSString.stringWithString_(eventData.title));
    const start = formatter.dateFromString_(NSString.stringWithString_(eventData.startDate));
    evt.setStartDate_(start);
    const end = formatter.dateFromString_(NSString.stringWithString_(eventData.endDate));
    evt.setEndDate_(end);
    evt.setCalendar_(eventStore.defaultCalendarForNewEvents());

    // https://github.com/frida/frida/issues/729
    const errorPtr = Memory.alloc(Process.pointerSize);
    Memory.writePointer(errorPtr, NULL);

    eventStore.saveEvent_span_commit_error_(evt, 0, 1, errorPtr);

    const error = Memory.readPointer(errorPtr);
    if (!error.isNull()) {
        const errorObj = new ObjC.Object(error); // now you can treat errorObj as an NSError instance
        console.error(errorObj.toString());
    }
}

addCalendarEvent(${JSON.stringify(eventData)});`,
    addContact: (contactData: ContactData) => `function addContact(contactData) {
    const CNMutableContact = ObjC.classes.CNMutableContact;
    const NSString = ObjC.classes.NSString;
    const CNLabeledValue = ObjC.classes.CNLabeledValue;
    const CNPhoneNumber = ObjC.classes.CNPhoneNumber;
    const CNSaveRequest = ObjC.classes.CNSaveRequest;
    const NSMutableArray = ObjC.classes.NSMutableArray;
    const CNContactStore = ObjC.classes.CNContactStore;

    const contact = CNMutableContact.alloc().init();
    contact.setLastName_(NSString.stringWithString_(contactData.lastName));
    if(contactData.firstName) contact.setFirstName_(NSString.stringWithString_(contactData.firstName));

    if (contactData.phoneNumber) {
        const number = CNPhoneNumber.phoneNumberWithStringValue_(NSString.stringWithString_(contactData.phoneNumber));
        const homePhone = CNLabeledValue.labeledValueWithLabel_value_(NSString.stringWithString_('home'), number);
        const numbers = NSMutableArray.alloc().init();
        numbers.addObject_(homePhone);
        contact.setPhoneNumbers_(numbers);
    }

    if(contactData.email) {
         const email = NSString.stringWithString_(contactData.email);
         const homeEmail = CNLabeledValue.labeledValueWithLabel_value_(NSString.stringWithString_('home'), email);
         const emails = NSMutableArray.alloc().init();
         emails.addObject_(homeEmail);
         contact.setEmailAddresses_(emails);
    }

    const request = CNSaveRequest.alloc().init();
    request.addContact_toContainerWithIdentifier_(contact, null);

    // https://github.com/frida/frida/issues/729
    const errorPtr = Memory.alloc(Process.pointerSize);
    Memory.writePointer(errorPtr, NULL);

    const store = CNContactStore.alloc().init();
    store.executeSaveRequest_error_(request, errorPtr);

    const error = Memory.readPointer(errorPtr);
    if (!error.isNull()) {
        var errorObj = new ObjC.Object(error); // now you can treat errorObj as an NSError instance
        console.error(errorObj.toString());
    }
}
addContact(${JSON.stringify(contactData)});`,
} as const;

export const iosApi = <RunTarget extends SupportedRunTarget<'ios'>>(
    platformApiOptions: PlatformApiOptions<'ios', RunTarget, SupportedCapability<'ios'>[]>
): PlatformApi<'ios', 'device', SupportedCapability<'ios'>[]> => ({
    target: { platform: 'ios', runTarget: platformApiOptions.runTarget },
    _internal: {
        ssh: async (command, commandOptions) => {
            const killProxyProcess = !platformApiOptions.targetOptions?.ip
                ? await startUsbmuxProxy(22161, platformApiOptions.targetOptions?.port || 22)
                : undefined;

            const username = platformApiOptions.targetOptions?.username || 'mobile';
            const password = platformApiOptions.targetOptions?.password || 'alpine';

            const ssh = await new NodeSSH().connect({
                host: platformApiOptions.targetOptions?.ip || '127.0.0.1',
                port: platformApiOptions.targetOptions?.ip ? platformApiOptions.targetOptions?.port ?? 22 : 22161,
                username,
                password,
            });
            ssh.connection?.on('error', () => killProxyProcess?.());
            ssh.connection?.on('close', () => killProxyProcess?.());

            const escapedCommand =
                username === 'mobile'
                    ? `echo "${Buffer.from(password).toString(
                          'base64'
                      )}" | base64 -d | sudo -S /bin/zsh -c ${escapeCommand(command)}`
                    : `/bin/zsh -c ${escapeCommand(command)}`;

            const res = await ssh.execCommand(escapedCommand, commandOptions?.nodeSSHOptions);
            // Creating and disposing a new SSH connection for each command is not efficient but it replicates the
            // previous behaviour of calling `ssh`. If we wanted to keep the connection open, we would also need a way
            // to dispose of it at the very end, but we don't know when that is (cf. #24).
            ssh.dispose();

            if ((commandOptions?.reject ?? true) && res.code !== 0)
                throw new Error(`SSH command failed with exit code ${res.code}: ${res.stderr}`);
            return res;
        },
        async setupEnvironment() {
            if (!platformApiOptions.capabilities.includes('ssh'))
                throw new Error('SSH is required for setting up the environment.');

            const neededPackages = ['sqlite3', 'com.conradkramer.open', 'ldid'];
            if (platformApiOptions.capabilities.includes('frida')) neededPackages.push('re.frida.server', 'plutil');
            if (platformApiOptions.capabilities.includes('certificate-pinning-bypass'))
                neededPackages.push('com.julioverne.sslkillswitch2');

            const { stdout: packageList } = await this.ssh(['apt', 'list', '--installed']);
            const packagesToInstall = neededPackages.filter(
                (p) => !packageList.split('\n').some((l) => l.startsWith(`${p}/`))
            );
            if (packagesToInstall.length > 0) {
                // https://github.com/tweaselORG/appstraction/issues/59

                await this.ssh([
                    `echo "Types: deb
URIs: http://apt.thebigboss.org/repofiles/cydia/
Suites: stable
Components: main

Types: deb
URIs: https://build.frida.re/
Suites: ./
Components:

Types: deb
URIs: https://julioverne.github.io/
Suites: ./
Components:" > /etc/apt/sources.list.d/appstraction.sources`,
                ]);
                // Let’s clear the list cache, so that we get fresh versions of packages (See https://github.com/tweaselORG/cli/issues/24)
                await this.ssh(['apt-get', 'clean']);
                // We need to quote the whole command, because otherwise the glob pattern will not be expanded
                await this.ssh(['/usr/bin/rm -rf /var/lib/apt/lists/*']);

                await this.ssh(['apt-get', '--allow-insecure-repositories', 'update']);
                await this.ssh(['apt-get', '--allow-unauthenticated', '-y', 'install', ...packagesToInstall]);

                if (packagesToInstall.includes('re.frida.server')) {
                    // Install the frida-server deamon workaround (https://github.com/frida/frida/issues/2375)
                    // TODO: Replace this with simple-plist once #82 is merged to remove the dependency on plutil
                    await this.ssh([
                        'plutil',
                        '-remove',
                        '-key',
                        'LimitLoadToSessionType',
                        '/Library/LaunchDaemons/re.frida.server.plist',
                    ]);
                    await this.ssh(['launchctl', 'load', '-w', '/Library/LaunchDaemons/re.frida.server.plist']);
                }

                if (packagesToInstall.includes('com.conradkramer.open')) {
                    // We need to sign the open binary to prevent iOS from killing it immediately.
                    // see https://github.com/tweaselORG/meta/issues/4#issuecomment-1380501906
                    await this.ssh(['ldid', '-s', '/usr/bin/open']);
                }
            }
        },
        async ensureFrida() {
            if (!platformApiOptions.capabilities.includes('frida')) return;

            const fridaIsRunning = async () =>
                (await python('frida-ps', ['-U'], { reject: false })).stdout.includes('frida-server');

            if (!(await fridaIsRunning()) && platformApiOptions.capabilities.includes('ssh')) {
                await this.ssh(['frida-server', '-D']);
                if (!(await retryCondition(fridaIsRunning, 20))) throw new Error('Frida server did not start.');
            }

            const session = await frida
                .getUsbDevice()
                .then((f) => f.attach('SpringBoard'))
                .catch((err) => {
                    throw new Error('Cannot connect using Frida.', { cause: err });
                });
            await session.detach();
        },
    },

    resetDevice: asyncUnimplemented('resetDevice') as never,
    snapshotDeviceState: asyncUnimplemented('snapshotDeviceState') as never,
    async waitForDevice(tries = 20, options?) {
        const abortSignal = options?.abortSignal;
        abortSignal?.throwIfAborted();
        if (
            !(await retryCondition(
                // Actually wait until the SpringBoard has been started and users could interact with the device.
                () =>
                    python('pymobiledevice3', ['springboard', 'state', 'get'], {
                        reject: false,
                        timeout: 10000,
                        signal: abortSignal,
                    }).then(({ stderr, exitCode }) => exitCode === 0 && !stderr.includes('ERROR')),
                tries,
                undefined,
                abortSignal
            ))
        )
            throw new Error('Failed to wait for device: No booted device found after timeout.');
    },
    async ensureDevice(ensureOptions) {
        const abortSignal = ensureOptions?.abortSignal;
        abortSignal?.throwIfAborted();
        const availableDevices = await listDevices({ frida: platformApiOptions.capabilities.includes('frida') });

        if (availableDevices.length > 1)
            throw new Error('You have multiple devices connected. Please disconnect all but one.');
        else if (availableDevices.length === 0) throw new Error('You need to connect your device.');
        else if (availableDevices.filter((device) => device.platform === 'ios').length === 0)
            throw new Error('You need to connect an iOS device.');

        if (
            (await python('pymobiledevice3', ['lockdown', 'info'], { reject: false, signal: abortSignal })).exitCode !==
            0
        )
            throw new Error('You need to trust this computer on your device.');

        if (platformApiOptions.capabilities.includes('ssh')) {
            try {
                const { stdout } = await this._internal.ssh(['uname']);
                if (stdout !== 'Darwin') throw new Error('Wrong uname output.');
            } catch (err) {
                throw new Error('Cannot connect using SSH.', { cause: err });
            }

            await this._internal.setupEnvironment();
        }

        if (platformApiOptions.capabilities.includes('frida')) {
            await this._internal.ensureFrida();
        }
    },
    clearStuckModals: asyncUnimplemented('clearStuckModals') as never,

    listApps: (options) =>
        python('pymobiledevice3', [
            'apps',
            'list',
            '--user',
            ...(options?.includeSystem ? ['--system'] : []),
            '--no-color',
        ]).then(({ stdout }) => Object.keys(JSON.parse(stdout))),
    async isAppInstalled(appId) {
        return (await this.listApps()).includes(appId);
    },
    installApp: (ipaPath) => python('pymobiledevice3', ['apps', 'install', ipaPath]).then(),
    uninstallApp: (appId) => python('pymobiledevice3', ['apps', 'uninstall', appId]).then(),

    async setAppPermissions(appId, _permissions) {
        if (!platformApiOptions.capabilities.includes('ssh') || !platformApiOptions.capabilities.includes('frida'))
            throw new Error('SSH and Frida are required for setting app permissions.');

        const permissionValues = { allow: 2, deny: 0 } as const;
        const setPermission = (permission: string, value: 0 | 2) =>
            this._internal.ssh([
                `sqlite3 /private/var/mobile/Library/TCC/TCC.db "INSERT OR REPLACE INTO access (service, client, client_type, auth_value, auth_reason, auth_version) VALUES('${permission}', '${appId}', 0, ${value}, 2, 1);"`,
            ]);
        const unsetPermission = (permission: string) =>
            this._internal.ssh([
                `sqlite3 /private/var/mobile/Library/TCC/TCC.db "DELETE FROM access WHERE service='${permission}' AND client='${appId}';"`,
            ]);
        const locationPermissionValues = { ask: 0, never: 2, always: 3, 'while-using': 4 } as const;
        const grantLocationPermission = async (value: 0 | 2 | 3 | 4) => {
            const session = await frida.getUsbDevice().then((f) => f.attach('SpringBoard'));
            const script = await session.createScript(fridaScripts.grantLocationPermission(appId, value));
            await script.load();
            await session.detach();
        };

        type Permissions = Exclude<typeof _permissions, undefined>;
        const permissions =
            _permissions ||
            iosPermissions.reduce<Permissions>((acc, p) => ({ ...acc, [p]: 'allow' }), { location: 'always' });

        for (const [permission, to] of Object.entries(permissions)) {
            if (permission === 'location') {
                if (!(to in locationPermissionValues)) throw new Error(`Invalid location permission value: "${to}"`);
                const value = locationPermissionValues[to as 'always'];
                await grantLocationPermission(value);
                continue;
            }

            if (to === 'unset') await unsetPermission(permission);
            else if (to in permissionValues) await setPermission(permission, permissionValues[to as 'allow']);
            else throw new Error(`Invalid permission value for "${permission}": "${to}"`);
        }
    },
    setAppBackgroundBatteryUsage: asyncUnimplemented('setAppBatteryOptimization') as never,
    async startApp(appId) {
        if (platformApiOptions.capabilities.includes('frida')) {
            const session = await frida.getUsbDevice().then((f) => f.attach('SpringBoard'));
            const script = await session.createScript(fridaScripts.startApp(appId));
            await script.load();
            await session.detach();
        } else if (platformApiOptions.capabilities.includes('ssh')) {
            this._internal.ssh(['open', appId]);
        } else {
            throw new Error('Frida or SSH (with the open package installed) is required for starting apps.');
        }
    },
    async stopApp(appId) {
        if (!platformApiOptions.capabilities.includes('frida')) throw new Error('Frida is required for stopping apps.');

        const pid = await this.getPidForAppId(appId);
        if (!pid) return;

        return (await frida.getUsbDevice()).kill(pid);
    },

    getForegroundAppId: async () => {
        if (!platformApiOptions.capabilities.includes('frida'))
            throw new Error('Frida is required for getting the foreground app ID.');

        const device = await frida.getUsbDevice();
        const app = await device.getFrontmostApplication();
        return app?.identifier;
    },
    getPidForAppId: async (appId) => {
        if (!platformApiOptions.capabilities.includes('frida'))
            throw new Error('Frida is required for getting the PID for an app ID.');

        const { stdout: psJson } = await python('frida-ps', ['--usb', '--applications', '--json']);
        const ps: { pid: number; name: string; identifier: string }[] = JSON.parse(psJson);
        return ps.find((p) => p.identifier === appId)?.pid;
    },
    async getPrefs(appId) {
        if (!platformApiOptions.capabilities.includes('frida')) throw new Error('Frida is required for getting prefs.');

        const pid = await this.getPidForAppId(appId);
        const res = await getObjFromFridaScript(pid, fridaScripts.getPrefs);
        if (isRecord(res)) return res;
        throw new Error('Failed to get prefs.');
    },
    async getDeviceAttribute(attribute, ...args) {
        // IDFV
        if (attribute === 'idfv') {
            if (!platformApiOptions.capabilities.includes('frida'))
                throw new Error('Frida is required for getting the IDFV.');

            const opts = args[0]!;

            const pid = await this.getPidForAppId(opts.appId);
            const idfv = await getObjFromFridaScript(pid, fridaScripts.getIdfv);
            if (typeof idfv === 'string') return idfv;
            throw new Error('Failed to get IDFV.');
        }

        // Manufacturer
        if (attribute === 'manufacturer') return 'Apple';

        // Attributes returned by `pymobiledevice3 lockdown info`
        const lockdownAttributes = {
            architectures: 'CPUArchitecture',
            modelCodeName: 'HardwareModel',
            name: 'DeviceName',
            osBuild: 'BuildVersion',
            osVersion: 'ProductVersion',
        } as const;
        if (!Object.keys(lockdownAttributes).includes(attribute))
            throw new Error(`Unsupported device attribute: ${attribute}`);

        const device = await python('pymobiledevice3', ['lockdown', 'info', '--no-color']).then(
            ({ stdout }) =>
                JSON.parse(stdout) as {
                    BuildVersion: string;
                    CPUArchitecture: string;
                    DeviceName: string;
                    HardwareModel: string;
                    ProductVersion: string;
                }
        );

        if (!device) throw new Error('No device connected.');

        return device[lockdownAttributes[attribute as Exclude<typeof attribute, 'idfv' | 'manufacturer'>]];
    },
    async setClipboard(text) {
        if (!platformApiOptions.capabilities.includes('frida'))
            throw new Error('Frida is required for setting the clipboard.');

        const session = await frida.getUsbDevice().then((f) => f.attach('SpringBoard'));
        const script = await session.createScript(fridaScripts.setClipboard(text));
        await script.load();
        await session.detach();
    },

    async installCertificateAuthority(path) {
        if (!platformApiOptions.capabilities.includes('ssh'))
            throw new Error('SSH is required for installing a certificate authority.');

        const { cert, certDer } = await parsePemCertificateFromFile(path);

        const sha256 = createHash('sha256').update(certDer).digest('hex');
        const subj = Buffer.from(cert.subject.toSchema().valueBlock.toBER()).toString('hex');
        const tset = Buffer.from(
            `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array/>
</plist>`
        ).toString('hex');
        const data = certDer.toString('hex');

        await this._internal.ssh([
            `sqlite3 /private/var/protected/trustd/private/TrustStore.sqlite3 "INSERT OR REPLACE INTO tsettings (sha256, subj, tset, data) VALUES(x'${sha256}', x'${subj}', x'${tset}', x'${data}');"`,
        ]);
    },
    async removeCertificateAuthority(path) {
        if (!platformApiOptions.capabilities.includes('ssh'))
            throw new Error('SSH is required for removing a certificate authority.');

        const { certDer } = await parsePemCertificateFromFile(path);
        const sha256 = createHash('sha256').update(certDer).digest('hex');

        await this._internal.ssh([
            `sqlite3 /private/var/protected/trustd/private/TrustStore.sqlite3 "DELETE FROM tsettings WHERE sha256=x'${sha256}';"`,
        ]);
    },
    setProxy: async (proxy) => {
        if (!platformApiOptions.capabilities.includes('frida'))
            throw new Error('Frida is required for configuring a proxy.');

        // Set proxy settings.
        const session = await frida.getUsbDevice().then((f) => f.attach('SpringBoard'));
        const script = await session.createScript(fridaScripts.setProxy(proxy));
        await script.load();
        await session.detach();

        // Verify that the proxy settings were set.
        const proxySettings = await getObjFromFridaScript('SpringBoard', fridaScripts.getProxy);
        if (
            !isRecord(proxySettings) ||
            (proxy === null && (proxySettings['HTTPProxy'] || proxySettings['HTTPSProxy'])) ||
            (proxy !== null &&
                (proxySettings['HTTPProxy'] !== proxy?.host ||
                    proxySettings['HTTPPort'] !== proxy?.port + '' ||
                    proxySettings['HTTPSProxy'] !== proxy?.host ||
                    proxySettings['HTTPSPort'] !== proxy?.port + ''))
        )
            throw new Error('Failed to set proxy.');
    },
    async addCalendarEvent(eventData) {
        if (!platformApiOptions.capabilities.includes('frida'))
            throw new Error('Frida is required to add events to the calendar.');

        const calendarAppId = 'com.apple.mobilecal';

        // The ObjC formatter does not understand milliseconds
        const simplifiedISO = (date: Date) => date.toISOString().replace(/\.[0-9]{0,3}Z$/, 'Z');

        await this.startApp(calendarAppId);
        await retryCondition(async () => (await this.getForegroundAppId()) === calendarAppId, 100, 100);
        await pause(2000);

        const device = await frida.getUsbDevice();
        const session = await device.attach('Calendar');
        const addEvent = await session.createScript(
            fridaScripts.addCalendarEvent({
                title: eventData.title,
                startDate: simplifiedISO(eventData.startDate),
                endDate: simplifiedISO(eventData.endDate),
            })
        );
        await addEvent.load();
        await session.detach();

        await this.stopApp(calendarAppId);
    },
    async addContact(contactData) {
        if (!platformApiOptions.capabilities.includes('frida'))
            throw new Error('Frida is required to add contacts to the contact book.');

        const contactsAppId = 'com.apple.MobileAddressBook';

        await this.startApp(contactsAppId);
        await retryCondition(async () => (await this.getForegroundAppId()) === contactsAppId, 100, 100);
        await pause(2000);

        const device = await frida.getUsbDevice();
        const session = await device.attach('Contacts');
        const addContact = await session.createScript(fridaScripts.addContact(contactData));
        await addContact.load();
        await session.detach();

        await this.stopApp(contactsAppId);
    },
    setDeviceName: (deviceName) => python('pymobiledevice3', ['lockdown', 'device-name', deviceName]).then(),
});

/** The IDs of known permissions on iOS. */
export const iosPermissions = [
    'kTCCServiceLiverpool',
    'kTCCServiceUbiquity',
    'kTCCServiceCalendar',
    'kTCCServiceAddressBook',
    'kTCCServiceReminders',
    'kTCCServicePhotos',
    'kTCCServiceMediaLibrary',
    'kTCCServiceBluetoothAlways',
    'kTCCServiceMotion',
    'kTCCServiceWillow',
    'kTCCServiceExposureNotification',
    'kTCCServiceCamera',
    'kTCCServiceMicrophone',
    'kTCCServiceUserTracking',
] as const;
/** An ID of a known permission on iOS. */
export type IosPermission = (typeof iosPermissions)[number];
