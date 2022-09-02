// Packages
import { assertEquals } from 'typescript-is';
import process from 'process';
import * as Sentry from '@sentry/node';
import { RewriteFrames } from '@sentry/integrations';
import { getRootData } from '@sapphire/pieces';
import { join } from 'node:path';
import { Intents } from 'discord.js';
import '@sapphire/plugin-api/register';
import 'reflect-metadata';
import { ApplicationCommandRegistries, container, LogLevel } from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
// import Flagsmith from 'flagsmith-nodejs';
import '@sapphire/plugin-hmr/register';
import { ScheduledTaskRedisStrategy } from '@sapphire/plugin-scheduled-tasks/register-redis';
import { SuiseiClient } from './lib/SuiseiClient';

// Types
import type {
	BaseConfigCheck,
	MasterConfig,
	SlaveConfig,
	StandAloneConfig,
} from './lib/types/config';

// Local files
// eslint-disable-next-line import/extensions,global-require
const config: MasterConfig | SlaveConfig | StandAloneConfig = require('../config.js');

// Config validation
try {
	assertEquals<BaseConfigCheck>(config);
	if (config.mode === 'master') {
		assertEquals<MasterConfig>(config);
	} else if (config.mode === 'slave') {
		assertEquals<SlaveConfig>(config);
	} else if (config.mode === 'standalone') {
		assertEquals<StandAloneConfig>(config);
	}
} catch (err: any) {
	if (err) container.logger.error(`${err.name}: ${err.message}`);
	console.error('Invalid config, quiting');
	process.exit(1);
}

console.info('Config validated. Initializing.');
// Set config in the Saphire container
container.config = config;

// Enable Flagsmith
/* const flagsmith = new Flagsmith({
	api: config.config.api ?? 'https://config.suisei.app',
	environmentKey: config.config.environmentId,
});
container.remoteConfig = flagsmith; */

// Enable Sentry if needed
if (config.sentry) {
	Sentry.init({
		dsn: config.sentry.dsn,
		integrations: [
			new Sentry.Integrations.Modules(),
			new Sentry.Integrations.Http({ breadcrumbs: true, tracing: true }),
			new RewriteFrames({ root: join(getRootData().root, '..') }),
		],
	});
}

// Client init logic
const client = new SuiseiClient({
	partials: ['CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION'],
	intents: [
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_BANS,
		Intents.FLAGS.GUILDS,
	],
	defaultPrefix: config.overrides?.discord?.defaultPrefix ?? '!',
	loadMessageCommandListeners: true,
	logger: {
		level: process.env.NODE_ENV !== 'production' ? LogLevel.Debug : LogLevel.Info,
	},
	api: {
		listenOptions: {
			port: config.api?.port,
		},
	},
	tasks: {
		strategy: new ScheduledTaskRedisStrategy({
			bull: {
				connection: {
					host: config.redis?.host,
				},
			},
		}),
	},
	hmr: {
		enabled: process.env.NODE_ENV === 'development',
	},
});

async function main() {
	await client.login(config.discord.token);

	// Register commands
	// This needs to be done outside, since there's no override available for the Subcommand class
	const configRegistry = ApplicationCommandRegistries.acquire('config');
	configRegistry.registerChatInputCommand((builder) => {
		builder
			.setName('config')
			.setDescription('Manage guild config')
			.addSubcommand((command) => command
				.setName('set')
				.setDescription('Set a config option')
				.addStringOption((optBuilder) => optBuilder
					.setRequired(true)
					.setName('key')
					.setDescription('Config key to set')
					.setAutocomplete(true))
				.addStringOption((optBuilder) => optBuilder
					.setRequired(true)
					.setName('value')
					.setDescription('Value to set it to')))
			.addSubcommand((command) => command
				.setName('get')
				.setDescription('Get a config value')
				.addStringOption((optBuilder) => optBuilder
					.setRequired(true)
					.setName('key')
					.setDescription('Config key to get')
					.setAutocomplete(true)));
	});

	// YouTube subscriptions
	const subscriptionsRegistry = ApplicationCommandRegistries.acquire('subscriptions');
	subscriptionsRegistry.registerChatInputCommand((builder) => {
		builder
			.setName('subscriptions')
			.setDescription('Manage YouTube notification subscriptions')
			.addSubcommand((command) => command
				.setName('add')
				.setDescription('Add a subscription')
				.addStringOption((optBuilder) => optBuilder
					.setRequired(true)
					.setName('vtuber')
					.setDescription('VTuber to send notifications for')
					.setAutocomplete(true))
				.addChannelOption((optBuilder) => optBuilder
					.setRequired(true)
					.setName('channel')
					.setDescription('Channel to send notifications in'))
				.addStringOption((optBuilder) => optBuilder
					.setRequired(true)
					.setName('message')
					.setDescription('Message to include in the notification')))
			.addSubcommand((command) => command
				.setName('remove')
				.setDescription('Remove a subscription')
				.addStringOption((optBuilder) => optBuilder
					.setRequired(true)
					.setName('vtuber')
					.setDescription('VTuber to send notifications for')
					.setAutocomplete(true))
				.addChannelOption((optBuilder) => optBuilder
					.setRequired(true)
					.setName('channel')
					.setDescription('Channel to send notifications in')))
			.addSubcommand((command) => command
				.setName('list')
				.setDescription('List all subscriptions')
				.addChannelOption((optBuilder) => optBuilder
					.setRequired(true)
					.setName('channel')
					.setDescription('Channel to send notifications in')));
	});
}

// eslint-disable-next-line no-void
void main();
