import { SapphireClientOptions } from '@sapphire/framework';
import { PrismaClient } from '@prisma/client';
import type { Logger as WinstonLogger } from 'winston';
import { MasterConfig, SlaveConfig, StandAloneConfig } from './config';

declare module 'discord.js' {
	interface Client {
	}

	interface ClientOptions extends SapphireClientOptions {
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		db: PrismaClient;
		// @ts-ignore
		logger: WinstonLogger;
		// remoteConfig: IFlagsmith;
		config: MasterConfig | SlaveConfig | StandAloneConfig;
		isMaster: () => this is MasterContainer;
		isSlave: () => this is SlaveContainer;
	}

	interface SlaveContainer extends Container {
		isMaster: () => false;
		isSlave: () => true;
		config: SlaveConfig;
	}

	interface MasterContainer extends Container {
		isMaster: () => true;
		isSlave: () => false;
		config: MasterConfig;
	}
}
