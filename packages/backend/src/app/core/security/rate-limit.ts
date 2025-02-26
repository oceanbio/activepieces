import RateLimitPlugin from '@fastify/rate-limit'
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import FastifyPlugin from 'fastify-plugin'
import { Redis } from 'ioredis'
import { createRedisClient } from '../../database/redis-connection'
import { QueueMode, system } from '../../helper/system/system'
import { SystemProp } from '../../helper/system/system-prop'
import { extractClientRealIp } from '../../helper/network-utils'

const API_RATE_LIMIT_AUTHN_ENABLED = system.getBoolean(SystemProp.API_RATE_LIMIT_AUTHN_ENABLED)

export const rateLimitModule: FastifyPluginAsyncTypebox = FastifyPlugin(async (app) => {
    if (API_RATE_LIMIT_AUTHN_ENABLED) {
        await app.register(RateLimitPlugin, {
            global: false,
            keyGenerator: extractClientRealIp,
            redis: getRedisClient(),
        })
    }
})

const getRedisClient = (): Redis | undefined => {
    const redisIsNotConfigured = system.get<QueueMode>(SystemProp.QUEUE_MODE) !== QueueMode.REDIS

    if (redisIsNotConfigured) {
        return undefined
    }

    return createRedisClient({
        connectTimeout: 500,
        maxRetriesPerRequest: 1,
    })
}
