import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { CreateOrRenameFolderRequest, FolderId, ListFolderRequest } from '@activepieces/shared'
import { FastifyRequest } from 'fastify'
import { flowFolderService as folderService } from './folder.service'
import { StatusCodes } from 'http-status-codes'
import { Static, Type } from '@sinclair/typebox'
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization'
import { eventsHooks } from '../../helper/audit-events'
import { ApplicationEventName } from '@activepieces/ee-shared'

const DEFUALT_PAGE_SIZE = 10


const FolderIdParam = Type.Object({
    folderId: Type.String(),
})

type FolderIdParam = Static<typeof FolderIdParam>

export const folderController: FastifyPluginAsyncTypebox = async (fastify) => {
    fastify.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject)
    fastify.post(
        '/',
        {
            schema: {
                body: CreateOrRenameFolderRequest,
            },
        },
        async (request) => {
            const createdFolder = await folderService.create({ projectId: request.principal.projectId, request: request.body })
            eventsHooks.get().send(request, {
                action: ApplicationEventName.CREATED_FOLDER,
                folder: createdFolder,
                userId: request.principal.id,
            })
            return createdFolder
        },
    )


    fastify.post(
        '/:folderId',
        {
            schema: {
                params: FolderIdParam,
                body: CreateOrRenameFolderRequest,
            },
        },
        async (request) => {
            const updatedFlow = await folderService.update({ projectId: request.principal.projectId, folderId: request.params.folderId, request: request.body })

            eventsHooks.get().send(request, {
                action: ApplicationEventName.UPDATED_FOLDER,
                folder: updatedFlow,
                userId: request.principal.id,
            })

            return updatedFlow
        },
    )


    fastify.get(
        '/:folderId',
        async (
            request: FastifyRequest<{
                Params: {
                    folderId: FolderId
                }
            }>,
        ) => {
            return folderService.getOneOrThrow({ projectId: request.principal.projectId, folderId: request.params.folderId })
        },
    )


    fastify.get(
        '/',
        {
            schema: {
                querystring: ListFolderRequest,
            },
        },
        async (request) => {
            return folderService.list({ projectId: request.principal.projectId, cursorRequest: request.query.cursor ?? null, limit: request.query.limit ?? DEFUALT_PAGE_SIZE })
        },
    )


    fastify.delete(
        '/:folderId',
        async (
            request: FastifyRequest<{
                Params: {
                    folderId: FolderId
                }
            }>,
            reply,
        ) => {

            const folder = await folderService.getOneOrThrow({ projectId: request.principal.projectId, folderId: request.params.folderId })
            eventsHooks.get().send(request, {
                action: ApplicationEventName.DELETED_FOLDER,
                folder,
                userId: request.principal.id,
            })
            await folderService.delete({ projectId: request.principal.projectId, folderId: request.params.folderId })
            return reply.status(StatusCodes.OK).send()
        },
    )
}
