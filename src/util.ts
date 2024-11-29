import { runAndroidDevTool } from 'andromatic';
import { getVenv } from 'autopy';
import type { ExecaChildProcess } from 'execa';
import { fileTypeFromFile } from 'file-type';
import type { TargetProcess } from 'frida';
import frida from 'frida';
import { createWriteStream } from 'fs';
import fs from 'fs-extra';
import type { FileHandle } from 'fs/promises';
import { open, readFile } from 'fs/promises';
import { hashFile } from 'hasha';
import _ipaInfo from 'ipa-extract-info';
import timeout from 'p-timeout';
import { Certificate } from 'pkijs';
import type { Readable } from 'stream';
import { temporaryFile } from 'tempy';
import { setTimeout } from 'timers/promises';
import type { Entry, ZipFile } from 'yauzl';
import { fromFd } from 'yauzl';
import { venvOptions } from '../scripts/common/python';
import type { AppMeta, AppPath, SupportedPlatform } from './index';

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const asyncNop = async () => {};
export const asyncUnimplemented = (action: string) => async () => {
    throw new Error('Unimplemented on this platform: ' + action);
};

export const retryCondition = async (
    condition: () => boolean | Promise<boolean>,
    maxTries = 50,
    pauseBetweenTries = 250,
    abortSignal?: AbortSignal
) => {
    let tries = 0;

    while (!(await condition())) {
        if (abortSignal?.aborted) return false;
        if (tries > maxTries) return false;

        await pause(pauseBetweenTries, abortSignal);
        tries++;
    }

    return true;
};

/**
 * Pause for a given duration.
 *
 * @param durationInMs The duration to pause for, in milliseconds.
 * @param abortSignal Provide a signal to abort the pause.
 */
export const pause = (durationInMs: number, abortSignal?: AbortSignal) =>
    setTimeout(durationInMs, undefined, { signal: abortSignal });

/**
 * Get metadata about the app at the given path.
 *
 * @remarks
 * If you pass multiple APKs from different apps, no error will be raised. The metadata for the first app will be
 * returned.
 * @param appPath Path to the app file (`.ipa` on iOS, `.apk` on Android) to get the metadata of. On Android, this can
 *   also be an array of the paths of the split APKs of a single app or the following custom APK bundle formats:
 *   `.xapk`, `.apkm` and `.apks`.
 * @param platform The platform the app file is for. If not provided, it will be inferred from the file extension.
 *
 * @returns An object containing the parsed metadata, or `undefined` if the file doesn't exist or is not a valid app for
 *   the platform.
 */
export const parseAppMeta = async <Platform extends SupportedPlatform>(
    appPath: AppPath<Platform>,
    _platform?: Platform
): Promise<AppMeta | undefined> => {
    const platform = _platform ?? (typeof appPath === 'string' && appPath.endsWith('.ipa') ? 'ios' : 'android');

    if (platform === 'android') {
        /**
         * @param options - `includeIsSplit`: The `isSplit` property is only used internally in this function if
         *   multiple APKs are passed. It should not be exposed to the end user.
         */
        const parseApk = async (apkPath: string, options: { includeIsSplit?: boolean } = {}) => {
            // This sometimes fails with `AndroidManifest.xml:42: error: ERROR getting 'android:icon' attribute: attribute
            // value reference does not exist` but still has the correct version in the output.
            const { stdout } = await runAndroidDevTool('aapt', ['dump', 'badging', apkPath], { reject: false });

            const id = stdout.match(/package: name='(.*?)'/)?.[1];
            if (!id) return undefined;

            const nativeCode =
                stdout
                    .match(/native-code: (.+)/)?.[1]
                    ?.split(' ')
                    .map((s) => s.replace(/'/g, ''))
                    .filter(Boolean) ?? [];
            // See: https://github.com/tweaselORG/appstraction/issues/4#issuecomment-1485068617 and
            // https://android.stackexchange.com/a/168320
            const architectureNativeCodeMap = {
                arm: 'armeabi-v7a',
                arm64: 'arm64-v8a',
                x86: 'x86',
                // eslint-disable-next-line camelcase
                x86_64: 'x86_64',
                mips: 'mips',
                mips64: 'mips64',
            } as const;

            return {
                platform,
                id,
                name: stdout.match(/application-label:'(.*?)'/)?.[1],
                version: stdout.match(/versionName='([^']+?)'/)?.[1],
                versionCode: stdout.match(/versionCode='([^']+?)'/)?.[1],
                architectures: (
                    Object.keys(architectureNativeCodeMap) as (keyof typeof architectureNativeCodeMap)[]
                ).filter((a) => nativeCode.includes(architectureNativeCodeMap[a])),
                ...(options.includeIsSplit && { isSplit: stdout.includes("split='") }),
            } as const;
        };

        if (Array.isArray(appPath)) {
            for (const apkPath of appPath) {
                const _meta = await parseApk(apkPath, { includeIsSplit: true });

                // The actual metadata is in the main APK, which has `isSplit: false`.
                if (_meta?.isSplit === false) {
                    // We only use the `isSplit` flag to identify the main APK, so we remove it here. Including
                    // `isSplit: false` would be misleading, since we are returning the metadata for the "whole" app,
                    // which may well consist of a main APK plus split APKs.
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { isSplit, ...meta } = _meta;

                    return {
                        ...meta,
                        md5: await hashFile(apkPath, { algorithm: 'md5' }),
                    };
                }
            }

            return undefined;
        } else if (appPath.endsWith('.xapk')) {
            const xapk = await open(appPath);
            return await getFileFromZip(xapk, 'manifest.json').then(async (manifest) => {
                if (!manifest) return undefined;
                const manifestString = await new Promise<string>((resolve) => {
                    let result = '';
                    manifest.on('data', (chunk) => (result += chunk.toString()));
                    manifest.on('end', () => resolve(result));
                });
                const manifestJson: XapkManifest = JSON.parse(manifestString);
                const baseApkFileName = manifestJson.split_apks?.find((apk) => apk.id === 'base');
                const baseApkPath = baseApkFileName && (await writeFileFromZipToTmp(xapk, baseApkFileName.file));
                await xapk.close();

                if (baseApkPath) {
                    const meta = await parseApk(baseApkPath);
                    if (meta)
                        return {
                            ...meta,
                            md5: await hashFile(appPath, { algorithm: 'md5' }),
                        };
                }
                return undefined;
            });
        } else if (appPath.endsWith('.apkm') || appPath.endsWith('.apks')) {
            if ((await fileTypeFromFile(appPath))?.mime !== 'application/zip')
                throw new Error(
                    'Failed to parse app meta: Encrypted apkm files are not supported, use the newer zip format instead.'
                );

            const bundle = await open(appPath);
            const baseApkPath = await writeFileFromZipToTmp(bundle, 'base.apk');
            await bundle.close();

            if (baseApkPath) {
                const meta = await parseApk(baseApkPath);
                if (meta)
                    return {
                        ...meta,
                        md5: await hashFile(appPath, { algorithm: 'md5' }),
                    };
            }
            return undefined;
        }

        const meta = await parseApk(appPath);
        if (meta)
            return {
                ...meta,
                md5: await hashFile(appPath, { algorithm: 'md5' }),
            };
        return undefined;
    } else if (platform === 'ios') {
        const meta = await ipaInfo(appPath as AppPath<'ios'>);

        const id = meta.info['CFBundleIdentifier'] as string | undefined;
        if (!id) return undefined;

        // As per: https://developer.apple.com/documentation/bundleresources/information_property_list/uirequireddevicecapabilities
        const architectureCapabilityMap = {
            arm: 'armv7',
            arm64: 'arm64',
        } as const;
        const architectures = (
            Object.keys(architectureCapabilityMap) as (keyof typeof architectureCapabilityMap)[]
        ).filter((a) => (meta.info['UIRequiredDeviceCapabilities'] as string[]).includes(architectureCapabilityMap[a]));

        return {
            platform,
            id,
            // See https://stackoverflow.com/a/15423880 for why we use `CFBundleDisplayName` instead of `CFBundleName`.
            name: meta.info['CFBundleDisplayName'] as string | undefined,
            version: meta.info['CFBundleShortVersionString'] as string | undefined,
            versionCode: meta.info['CFBundleVersion'] as string | undefined,
            architectures,
            md5: await hashFile(appPath as AppPath<'ios'>, { algorithm: 'md5' }),
        };
    }

    throw new Error(`Unsupported platform "${platform}".`);
};

export const ipaInfo = async (ipaPath: `${string}.ipa`) => {
    const fd = await fs.open(ipaPath, 'r');
    return await _ipaInfo(fd);
};

export const getObjFromFridaScript = async (targetProcess: TargetProcess | undefined, script: string) => {
    if (!targetProcess) throw new Error('Must provide targetProcess.');
    const fridaDevice = await frida.getUsbDevice();
    const fridaSession = await fridaDevice.attach(targetProcess);
    const fridaScript = await fridaSession.createScript(script);
    const resultPromise = new Promise<unknown>((res, rej) => {
        fridaScript.message.connect((message) => {
            if (message.type === 'send' && message.payload?.name === 'get_obj_from_frida_script')
                res(message.payload?.payload);
            else rej(message);
        });
    });
    await fridaScript.load();

    await fridaSession.detach();
    return await resultPromise; // We want this to be caught here if it fails, thus the `await`.
};

export const isRecord = (maybeRecord: unknown): maybeRecord is Record<string, unknown> =>
    !!maybeRecord && typeof maybeRecord === 'object';

/**
 * Promise wrapper for yauzl.fromFd.
 *
 * @param zip FileHandle of the zip file.
 *
 * @returns ZipFile to be used with yauzl.
 */
export const openZipFile = async (zip: FileHandle) =>
    new Promise<ZipFile>((resolve) => {
        fromFd(zip.fd, { lazyEntries: true }, (err, zipFile) => {
            if (err) throw err;
            resolve(zipFile);
        });
    });

/**
 * Run a function on each entry in a zip file. Resolves if all entries have been processed.
 *
 * @param zip FileHandle of the zip file.
 * @param callback Function to run on each entry, it will receive the entry and a reference to the current ZipFile.
 */
export const forEachInZip = async (zip: FileHandle, callback: (entry: Entry, zipFile: ZipFile) => Promise<void>) =>
    openZipFile(zip).then(
        (zipFile) =>
            new Promise<void>((resolve) => {
                zipFile.readEntry();
                zipFile.on('entry', (entry: Entry) => {
                    callback(entry, zipFile).then(() => zipFile.readEntry());
                });
                zipFile.on('end', () => resolve());
            })
    );

/**
 * Get a Readable stream of a file entry in a zip file.
 *
 * @param zip FileHandle of the zip file.
 * @param filename Name of the file entry in the zip.
 *
 * @returns A Readable stream of the file entry, or void if the file entry was not found.
 */
export const getFileFromZip = async (zip: FileHandle, filename: string) =>
    openZipFile(zip).then(
        (zipFile) =>
            new Promise<Readable | void>((resolve) => {
                zipFile.readEntry();
                zipFile.on('entry', (entry: Entry) => {
                    if (entry.fileName !== filename) {
                        zipFile.readEntry();
                        return;
                    }
                    zipFile.openReadStream(entry, (err, stream) => {
                        if (err) throw err;
                        resolve(stream);
                    });
                });
                zipFile.on('end', () => resolve());
            })
    );

export const writeFileFromZipToTmp = async (zip: FileHandle, filename: string) =>
    openZipFile(zip).then(
        (zipFile) =>
            new Promise<string | void>((resolve) => {
                zipFile.readEntry();
                zipFile.on('entry', (entry: Entry) => {
                    if (entry.fileName !== filename) {
                        zipFile.readEntry();
                        return;
                    }
                    tmpFileFromZipEntry(zipFile, entry).then((tmpFile) => resolve(tmpFile));
                });
                zipFile.on('end', () => resolve());
            })
    );

/**
 * Write the contents of a zip entry to a temporary file.
 *
 * @param zipFile Yauzl ZipFile to read from.
 * @param entry Entry in the zip file.
 * @param extension Optional file extension to use for the temporary file.
 *
 * @returns The file name of the temporary file.
 */
export const tmpFileFromZipEntry = async <Extension extends string>(
    zipFile: ZipFile,
    entry: Entry,
    extension?: Extension
) =>
    new Promise<`${string}.${Extension}`>((resolve) => {
        zipFile.openReadStream(entry, (err, stream) => {
            if (err) throw Error;
            const tmpFile = temporaryFile({ extension }) as `${string}.${Extension}`;
            stream.pipe(createWriteStream(tmpFile).on('finish', () => resolve(tmpFile)));
        });
    });

// Taken from: https://stackoverflow.com/a/67605309
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ParametersExceptFirst<F> = F extends (arg0: any, ...rest: infer R) => any ? R : never;

export type XapkManifest = {
    expansions?: { file: string; install_location: string; install_path: string }[];
    split_apks?: { file: string; id: string }[];
};

export const parsePemCertificateFromFile = async (path: string) => {
    const certPem = await readFile(path, 'utf8');

    // A PEM certificate is just a base64-encoded DER certificate with a header and footer.
    const certBase64 = certPem.replace(/(-----(BEGIN|END) CERTIFICATE-----|[\r\n])/g, '');
    const certDer = Buffer.from(certBase64, 'base64');

    return { cert: Certificate.fromBER(certDer), certPem, certDer };
};

// I adapted this from https://github.com/sindresorhus/execa/blob/b44d4066aebd2db0c7864936e710b9fa6f5ab9d2/lib/command.js#L12-L25

const NO_ESCAPE_REGEXP = /^[\w.-]+$/;
const DOUBLE_QUOTES_REGEXP = /"/g;
const IS_QUOTED_REGEXP = /^".*"$/s;

export const escapeArg = (arg: string) => {
    if (typeof arg !== 'string' || NO_ESCAPE_REGEXP.test(arg)) {
        return arg;
    }

    return `"${arg.replace(DOUBLE_QUOTES_REGEXP, '\\"')}"`;
};

export const escapeCommand = (args: string[]) => {
    const escapedCommand = args.map((arg) => escapeArg(arg)).join(' ');
    return IS_QUOTED_REGEXP.test(escapedCommand) ? escapedCommand : `'${escapedCommand}'`;
};

/**
 * Returns a list of all detected Android and iOS devices currently connected to the host. This includes Android
 * emulators running on the host.
 *
 * @param options If the `frida` option is set to `true`, this function will use frida to detect the devices rather than
 *   try to detect them using platform-specific tools (such as `adb` and `pymobiledevice3`).
 */
export const listDevices = async (options?: {
    frida?: boolean;
}): Promise<
    {
        /** A unique id that identifies the device to the platform tools and frida. */
        id: string;
        /**
         * The name or model of the device (adb sometimes can not find that information easily, so it might be
         * undefined)
         */
        name?: string;
        /** The platform the device is running on. */
        platform: 'android' | 'ios';
    }[]
> => {
    if (options?.frida)
        return await frida
            .enumerateDevices()
            .then((devices) => devices.filter((device) => device.type === 'usb'))
            .then((devices) =>
                Promise.all(
                    devices.map(async (device) => {
                        const params = await device.querySystemParameters();
                        return {
                            id: device.id,
                            name: device.name,
                            platform: params.platform === 'darwin' ? 'ios' : 'android',
                        };
                    })
                )
            );

    const venv = getVenv(venvOptions);
    const python = async (...args: Parameters<Awaited<typeof venv>>) => (await venv)(...args);

    const androidDevices = await runAndroidDevTool('adb', ['devices', '-l']).then(({ stdout }) => {
        const lines = stdout.split('\n');
        if (lines[0]?.includes('List of devices attached'))
            return lines
                .slice(1, -1)
                .map((line) => {
                    const device = line.split(/\s+/);

                    // Only return devices which are actually connected (possible values are 'device', 'offline' and 'no', see https://developer.android.com/tools/adb#devicestatus)
                    if (device[1] !== 'device') return undefined;

                    return device[0] && device[1]
                        ? {
                              id: device[0],
                              name: line.match(/model:(.+)? /)?.[1],
                              platform: 'android' as const,
                          }
                        : undefined;
                })
                .filter(Boolean) as { id: string; name?: string; platform: 'android' }[];
        return [];
    });

    const iosDevices = await python('pymobiledevice3', ['usbmux', 'list', '--no-color'], { reject: false }).then(
        ({ stdout, stderr }) =>
            !stderr.includes('ERROR') && stdout !== ''
                ? (JSON.parse(stdout) as Record<'DeviceName' | 'Identifier', string>[]).map((device) => ({
                      id: device.Identifier,
                      name: device.DeviceName,
                      platform: 'ios' as const,
                  }))
                : []
    );

    return [...androidDevices, ...iosDevices];
};

/**
 * Wait for a message to appear in stdout and resolve the promise if the message is detected.
 *
 * @param proc A child process.
 * @param startMessage The message to look for in stdout.
 */
export const awaitProcessStart = (proc: ExecaChildProcess<string>, startMessage: string) =>
    new Promise<true>((res) => {
        proc.stdout?.addListener('data', (chunk: Buffer) => {
            if (chunk.includes(startMessage)) {
                proc.stdout?.removeAllListeners('data');
                res(true);
            }
        });
    });

export const startUsbmuxProxy = async (srcPort: number, destPort: number): Promise<() => boolean> => {
    const pythonScript = `from pymobiledevice3.tcp_forwarder import TcpForwarder
import threading
import os
import signal

event = threading.Event()
# adapted this from https://stackoverflow.com/a/73750667
def raise_in_thread(args):
    threading.Timer(0.01, os._exit, args=(1,)).start()
    raise args.exc_type(args.exc_value).with_traceback(args.exc_traceback)
threading.excepthook = raise_in_thread

forwarder = TcpForwarder(${srcPort}, ${destPort}, listening_event=event)
signal.signal(signal.SIGINT, lambda _: forwarder.stop())
signal.signal(signal.SIGTERM, lambda _: forwarder.stop())

t = threading.Thread(target=forwarder.start)
t.start()
if event.wait(15):
    os.write(1, b'appstraction:Forwarder started')
else:
    raise Exception('Forwarder failed to start')
`;
    const venv = getVenv(venvOptions);
    const proc = (await venv)('python', ['-c', pythonScript]);
    proc.on('exit', (code) => {
        if (code && code !== 0) throw new Error(`Usbmux proxy exited with code ${code}: ${proc.stderr?.read()}`);
    });

    await timeout(awaitProcessStart(proc, 'appstraction:Forwarder started'), {
        milliseconds: 15000,
    });
    return proc.kill;
};
