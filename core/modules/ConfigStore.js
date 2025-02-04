const modulename = 'ConfigStore';
import fs from 'node:fs';
import { cloneDeep } from 'lodash-es';
import { defaultEmbedJson, defaultEmbedConfigJson } from '@modules/DiscordBot/defaultJsons';
import consoleFactory from '@lib/console';
import fatalError from '@lib/fatalError';
import { txEnv } from '@core/globalData';
const console = consoleFactory(modulename);


//Helper functions
const isUndefined = (x) => (x === undefined);
const toDefault = (input, defVal) => isUndefined(input) ? defVal : input;
const removeNulls = (obj) => {
    const isArray = obj instanceof Array;
    for (let k in obj) {
        if (obj[k] === null) isArray ? obj.splice(k, 1) : delete obj[k];
        else if (typeof obj[k] == 'object') removeNulls(obj[k]);
        if (isArray && obj.length == k) removeNulls(obj);
    }
    return obj;
};
const deepFreeze = (obj) => {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(function (prop) {
        if (obj.hasOwnProperty(prop)
            && obj[prop] !== null
            && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function')
            && !Object.isFrozen(obj[prop])
        ) {
            deepFreeze(obj[prop]);
        }
    });
    return obj;
};


/**
 * Module to handle the configuration file, validation, defaults and retrieval.
 */
export default class ConfigStore {
    configFilePath = `${txEnv.profilePath}/config.json`;
    configFile;
    #config; //the private one
    // config;  //the public mirror - done this way to protect against accidental changes

    constructor() {
        const fileData = this.getConfigFromFile();
        this.configFile = this.getConfigStructure(fileData);
        this.#config = this.getConfigDefaults(this.configFile);
        this.updatePublicConfig();
    }

    /**
     * Mirrors the #config object to the public deep frozen config object
     */
    updatePublicConfig() {
        // this.config = deepFreeze(cloneDeep(this.#config));
        globalThis.txConfig = deepFreeze(cloneDeep(this.#config));
    }


    /**
     * Returns the config file data
     */
    getConfigFromFile() {
        //Try to load config file
        //TODO: create a lock file to prevent starting twice the same config file?
        let rawFile;
        try {
            rawFile = fs.readFileSync(this.configFilePath, 'utf8');
        } catch (error) {
            fatalError.ConfigStore(10, [
                'Unable to read configuration file (filesystem error).',
                ['Path', this.configFilePath],
                ['Error', error.message],
            ]);
        }

        //Try to parse config file
        let cfgData;
        try {
            cfgData = JSON.parse(rawFile);
        } catch (error) {
            fatalError.ConfigStore(11, [
                'Unable to parse configuration file (invalid JSON).',
                'This means the file somehow got corrupted and is not a valid anymore.',
                ['Path', this.configFilePath],
                ['Error', error.message],
            ]);
        }

        return cfgData;
    }


    /**
     * ????????????
     * @param {object} cfgData
     */
    getConfigStructure(cfgData) {
        const cfg = cloneDeep(cfgData);
        const out = {
            global: null,
            logger: null,
            monitor: null,
            playerDatabase: null,
            webServer: null,
            discordBot: null,
            fxRunner: null,
            banTemplates: null,
        };

        //NOTE: this shit is ugly, but I wont bother fixing it.
        //      this entire config vault is stupid.
        //      use convict, lodash defaults or something like that
        cfg.playerDatabase = cfg.playerDatabase ?? cfg.playerController ?? {};

        try {
            out.global = {
                serverName: toDefault(cfg.global.serverName, null),
                language: toDefault(cfg.global.language, null),
                menuEnabled: toDefault(cfg.global.menuEnabled, true),
                menuAlignRight: toDefault(cfg.global.menuAlignRight, false),
                menuPageKey: toDefault(cfg.global.menuPageKey, 'Tab'),
                hideDefaultAnnouncement: toDefault(cfg.global.hideDefaultAnnouncement, false),
                hideDefaultDirectMessage: toDefault(cfg.global.hideDefaultDirectMessage, false),
                hideDefaultWarning: toDefault(cfg.global.hideDefaultWarning, false),
                hideDefaultScheduledRestartWarning: toDefault(cfg.global.hideDefaultScheduledRestartWarning, false),
                hideAdminInPunishments: toDefault(cfg.global.hideAdminInPunishments, true),
                hideAdminInMessages: toDefault(cfg.global.hideAdminInMessages, false),
            };
            out.logger = toDefault(cfg.logger, {}); //not in template
            out.monitor = {
                restarterSchedule: toDefault(cfg.monitor.restarterSchedule, []),
                cooldown: toDefault(cfg.monitor.cooldown, null), //not in template
                resourceStartingTolerance: toDefault(cfg.monitor.resourceStartingTolerance, 120), //not in template
            };
            out.playerDatabase = {
                onJoinCheckBan: toDefault(cfg.playerDatabase.onJoinCheckBan, true),
                whitelistMode: toDefault(cfg.playerDatabase.whitelistMode, 'disabled'),
                whitelistedDiscordRoles: toDefault(cfg.playerDatabase.whitelistedDiscordRoles, []),
                whitelistRejectionMessage: toDefault(
                    cfg.playerDatabase.whitelistRejectionMessage,
                    'Please join http://discord.gg/example and request to be whitelisted.',
                ),
                requiredBanHwidMatches: toDefault(cfg.playerDatabase.requiredBanHwidMatches, 1),
                banRejectionMessage: toDefault(
                    cfg.playerDatabase.banRejectionMessage,
                    'You can join http://discord.gg/example to appeal this ban.',
                ),
            };
            out.webServer = {
                disableNuiSourceCheck: toDefault(cfg.webServer.disableNuiSourceCheck, false), //not in template
                limiterMinutes: toDefault(cfg.webServer.limiterMinutes, null), //not in template
                limiterAttempts: toDefault(cfg.webServer.limiterAttempts, null), //not in template
            };
            out.discordBot = {
                enabled: toDefault(cfg.discordBot.enabled, null),
                token: toDefault(cfg.discordBot.token, null),
                guild: toDefault(cfg.discordBot.guild, null),
                announceChannel: toDefault(cfg.discordBot.announceChannel, null),
                embedJson: toDefault(cfg.discordBot.embedJson, defaultEmbedJson),
                embedConfigJson: toDefault(cfg.discordBot.embedConfigJson, defaultEmbedConfigJson),
            };
            out.fxRunner = {
                serverDataPath: toDefault(cfg.fxRunner.serverDataPath, null),
                cfgPath: toDefault(cfg.fxRunner.cfgPath, null),
                commandLine: toDefault(cfg.fxRunner.commandLine, null),
                logPath: toDefault(cfg.fxRunner.logPath, null), //not in template
                onesync: toDefault(cfg.fxRunner.onesync, 'on'),
                autostart: toDefault(cfg.fxRunner.autostart, null),
                restartDelay: toDefault(cfg.fxRunner.restartDelay, null), //not in template
                shutdownNoticeDelay: toDefault(cfg.fxRunner.shutdownNoticeDelay, null), //not in template
                quiet: toDefault(cfg.fxRunner.quiet, null),
            };
            out.banTemplates = toDefault(cfg.banTemplates, []); //not in template

            //Migrations
            //Removing menu beta convar (v4.9)
            out.fxRunner.commandLine = out.fxRunner.commandLine?.replace(/\+?setr? txEnableMenuBeta true\s?/gi, '');

            //Merging portuguese
            if (out.global.language === 'pt_PT' || out.global.language === 'pt_BR') {
                out.global.language = 'pt';
            }

            //Fixing resourceStartingTolerance being saved as string
            if (typeof out.monitor.resourceStartingTolerance === 'string') {
                out.monitor.resourceStartingTolerance = parseInt(out.monitor.resourceStartingTolerance);
                if (isNaN(out.monitor.resourceStartingTolerance)) {
                    out.monitor.resourceStartingTolerance = 120;
                }
            }
        } catch (error) {
            fatalError.ConfigStore(12, [
                'Unable to load configuration file (invalid configuration).',
                'This means the file somehow got corrupted and is not a valid anymore.',
                'Make sure your txAdmin is updated!',
                ['Path', this.configFilePath],
                ['Error', error.message],
            ]);
        }

        return out;
    }


    /**
     * Setup the this.#config variable based on the config file data
     * FIXME: rename this function
     * @param {object} cfgData
     */
    getConfigDefaults(cfgData) {
        const cfg = cloneDeep(cfgData);
        //NOTE: the bool trick in fxRunner.autostart won't work if we want the default to be true
        try {
            //Global
            cfg.global.serverName = cfg.global.serverName || 'change-me';
            cfg.global.language = cfg.global.language || 'en'; //TODO: move to GlobalData
            cfg.global.menuEnabled = (cfg.global.menuEnabled === 'true' || cfg.global.menuEnabled === true);
            cfg.global.menuAlignRight = (cfg.global.menuAlignRight === 'true' || cfg.global.menuAlignRight === true);
            cfg.global.menuPageKey = cfg.global.menuPageKey || 'Tab';
            cfg.global.hideDefaultAnnouncement = (cfg.global.hideDefaultAnnouncement === 'true' || cfg.global.hideDefaultAnnouncement === true);
            cfg.global.hideDefaultDirectMessage = (cfg.global.hideDefaultDirectMessage === 'true' || cfg.global.hideDefaultDirectMessage === true);
            cfg.global.hideDefaultWarning = (cfg.global.hideDefaultWarning === 'true' || cfg.global.hideDefaultWarning === true);
            cfg.global.hideDefaultScheduledRestartWarning = (cfg.global.hideDefaultScheduledRestartWarning === 'true' || cfg.global.hideDefaultScheduledRestartWarning === true);
            cfg.global.hideAdminInPunishments = (cfg.global.hideAdminInPunishments === 'true' || cfg.global.hideAdminInPunishments === true);
            cfg.global.hideAdminInMessages = (cfg.global.hideAdminInMessages === 'true' || cfg.global.hideAdminInMessages === true);

            //Logger - NOTE: this one default's i'm doing directly into the class
            cfg.logger.fxserver = toDefault(cfg.logger.fxserver, {});
            cfg.logger.server = toDefault(cfg.logger.server, {});
            cfg.logger.admin = toDefault(cfg.logger.admin, {});

            //Monitor
            cfg.monitor.restarterSchedule = cfg.monitor.restarterSchedule || [];
            cfg.monitor.cooldown = parseInt(cfg.monitor.cooldown) || 60; //not in template - 45 > 60 > 90 -> 60 after fixing the "extra time" logic
            cfg.monitor.resourceStartingTolerance = parseInt(cfg.monitor.resourceStartingTolerance) || 120;

            //Player Controller
            cfg.playerDatabase.onJoinCheckBan = (cfg.playerDatabase.onJoinCheckBan === null)
                ? true
                : (cfg.playerDatabase.onJoinCheckBan === 'true' || cfg.playerDatabase.onJoinCheckBan === true);
            cfg.playerDatabase.whitelistMode = cfg.playerDatabase.whitelistMode || 'disabled';
            cfg.playerDatabase.whitelistedDiscordRoles = cfg.playerDatabase.whitelistedDiscordRoles || [];
            cfg.playerDatabase.whitelistRejectionMessage = cfg.playerDatabase.whitelistRejectionMessage || '';
            cfg.playerDatabase.requiredBanHwidMatches = parseInt(cfg.playerDatabase.requiredBanHwidMatches) ?? 1;
            cfg.playerDatabase.banRejectionMessage = cfg.playerDatabase.banRejectionMessage || '';

            //WebServer
            cfg.webServer.disableNuiSourceCheck = (cfg.webServer.disableNuiSourceCheck === 'true' || cfg.webServer.disableNuiSourceCheck === true);
            cfg.webServer.limiterMinutes = parseInt(cfg.webServer.limiterMinutes) || 15; //not in template
            cfg.webServer.limiterAttempts = parseInt(cfg.webServer.limiterAttempts) || 10; //not in template

            //DiscordBot
            cfg.discordBot.enabled = (cfg.discordBot.enabled === 'true' || cfg.discordBot.enabled === true);
            cfg.discordBot.embedJson = cfg.discordBot.embedJson || defaultEmbedJson;
            cfg.discordBot.embedConfigJson = cfg.discordBot.embedConfigJson || defaultEmbedConfigJson;

            //FXRunner
            cfg.fxRunner.logPath = cfg.fxRunner.logPath || `${txEnv.profilePath}/logs/fxserver.log`; //not in template
            cfg.fxRunner.onesync = cfg.fxRunner.onesync || 'on';
            cfg.fxRunner.autostart = (cfg.fxRunner.autostart === 'true' || cfg.fxRunner.autostart === true);
            cfg.fxRunner.restartDelay = parseInt(cfg.fxRunner.restartDelay) || 750; //not in template
            cfg.fxRunner.shutdownNoticeDelay = parseInt(cfg.fxRunner.shutdownNoticeDelay) || 5; //not in template
            cfg.fxRunner.quiet = (cfg.fxRunner.quiet === 'true' || cfg.fxRunner.quiet === true);

            //Ban Templates
            //FIXME: this should be validated here, no module to do it
            cfg.banTemplates = cfg.banTemplates ?? [];
        } catch (error) {
            //If this is the first run, that is a fatal error
            if (!this.#config) {
                fatalError.ConfigStore(13, [
                    'Unknown error while loading the configuration file!',
                    'Make sure your txAdmin is updated!',
                    ['Path', this.configFilePath],
                ], error);
            } else {
                console.verbose.dir(error);
                throw new Error(`Malformed configuration file! Make sure your txAdmin is updated.\nOriginal error: ${error.message}`);
            }
        }

        return cfg;
    }


    /**
     * Return configs for a specific scope (reconstructed and freezed)
     */
    getScoped(scope) {
        return cloneDeep(this.#config[scope]);
    }


    /**
     * Return configs for a specific scope (reconstructed and freezed)
     */
    getScopedStructure(scope) {
        return cloneDeep(this.configFile[scope]);
    }


    /**
     * Return configs for a specific scope (reconstructed and freezed)
     */
    getRawFile() {
        return cloneDeep(this.configFile);
    }


    /**
     * Return all configs individually reconstructed and freezed
     */
    getAll() {
        const cfg = cloneDeep(this.#config);
        return deepFreeze({
            global: cfg.global,
            logger: cfg.logger,
            monitor: cfg.monitor,
            playerDatabase: cfg.playerDatabase,
            webServer: cfg.webServer,
            discordBot: cfg.discordBot,
            fxRunner: cfg.fxRunner,
        });
    }


    /**
     * Save the new scope to this context, then saves it to the configFile
     * @param {string} scope
     * @param {object} newConfig
     */
    saveProfile(scope, newConfig) {
        let toSave = cloneDeep(this.configFile);
        toSave[scope] = newConfig;
        toSave = removeNulls(toSave);
        fs.writeFileSync(this.configFilePath, JSON.stringify(toSave, null, 2), 'utf8');
        this.configFile = toSave;
        this.#config = this.getConfigDefaults(this.configFile);
        this.updatePublicConfig();
    }
};
