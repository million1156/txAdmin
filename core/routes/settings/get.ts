const modulename = 'WebServer:SettingsPage';
import { cloneDeep }  from 'lodash-es';
import { convars, txEnv } from '@core/globalData';
import localeMap from '@shared/localeMap';
import { redactApiKeys } from '@lib/misc';
import { defaultEmbedConfigJson, defaultEmbedJson } from '@modules/DiscordBot/defaultJsons';
import consoleFactory from '@lib/console';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
const console = consoleFactory(modulename);


/**
 * Returns the output page containing the live console
 */
export default async function SettingsPage(ctx: AuthedCtx) {
    //Check permissions
    if (!ctx.admin.hasPermission('settings.view')) {
        return ctx.utils.render('main/message', {message: 'You don\'t have permission to view this page.'});
    }

    //TODO: when migrating to react show in order: EN, browser language, separator, other languages
    const locales = Object.keys(localeMap).map(code => {
        return { code, label: localeMap[code].$meta.label };
    });
    locales.sort((a, b) => a.label.localeCompare(b.label));
    locales.push({ code: 'custom', label: 'Custom (txData/locale.json)' });

    const renderData = {
        headerTitle: 'Settings',
        locales,
        global: cleanRenderData(txCore.configStore.getScopedStructure('global')),
        fxserver: cleanRenderData(txCore.configStore.getScopedStructure('fxRunner')),
        playerDatabase: cleanRenderData(txCore.configStore.getScopedStructure('playerDatabase')),
        monitor: cleanRenderData(txCore.configStore.getScopedStructure('monitor')),
        discord: cleanRenderData(txCore.configStore.getScopedStructure('discordBot')),
        readOnly: !ctx.admin.hasPermission('settings.write'),
        serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        activeTab: 'global',
        isZapHosting: convars.isZapHosting,
        txDataPath: txEnv.dataPath,
        defaults: {
            discord: {
                embedJson: defaultEmbedJson,
                embedConfigJson: defaultEmbedConfigJson,
            }
        }
    };

    if (renderData.readOnly) {
        renderData.fxserver.commandLine = redactApiKeys(renderData.fxserver.commandLine);
    }

    return ctx.utils.render('main/settings', renderData);
};


//================================================================
function cleanRenderData(inputData: object) {
    const input = cloneDeep(inputData);

    const processValue = (inputValue: any): any => {
        if (inputValue === null || inputValue === false || typeof inputValue === 'undefined') {
            return '';
        } else if (inputValue === true) {
            return 'checked';
        } else if (Array.isArray(inputValue)) {
            return inputValue.join(', ');
        } else if (typeof inputValue === 'object') {
            return cleanRenderData(inputValue);
        } else {
            return inputValue;
        }
    }

    //Prepare output object
    const out: any = {};
    for (const [key, value] of Object.entries(input)) {
        const processed = processValue(value);
        out[key] = processed;
    }
    return out;
}
