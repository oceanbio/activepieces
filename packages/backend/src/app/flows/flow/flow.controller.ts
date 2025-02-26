import {
    ApId,
    CreateFlowRequest,
    FlowOperationRequest,
    FlowTemplateWithoutProjectInformation,
    GetFlowQueryParamsRequest,
    ListFlowsRequest,
    PopulatedFlow,
    Principal,
    PrincipalType,
    SeekPage,
} from '@activepieces/shared'
import { StatusCodes } from 'http-status-codes'
import { flowService } from './flow.service'
import { CountFlowsRequest } from '@activepieces/shared'
import dayjs from 'dayjs'
import { isNil } from 'lodash'
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization'
import { FastifyPluginAsyncTypebox, Type } from '@fastify/type-provider-typebox'
import { projectService } from '../../project/project-service'
import { eventsHooks } from '../../helper/audit-events'
import { ApplicationEventName } from '@activepieces/ee-shared'

const DEFAULT_PAGE_SIZE = 10

export const flowController: FastifyPluginAsyncTypebox = async (app) => {
    app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject)

    app.post('/', CreateFlowRequestOptions, async (request, reply) => {
        const newFlow = await flowService.create({
            projectId: request.principal.projectId,
            request: request.body,
        })

        eventsHooks.get().send(request, {
            action: ApplicationEventName.CREATED_FLOW,
            flow: newFlow,
            userId: request.principal.id,
        })

        return reply.status(StatusCodes.CREATED).send(newFlow)
    })

    app.post('/:id', UpdateFlowRequestOptions, async (request, reply) => {
        const flow = await flowService.getOnePopulatedOrThrow({
            id: request.params.id,
            projectId: request.principal.projectId,
        })
        // BEGIN EE
        const currentTime = dayjs()
        const userId = await extractUserIdFromPrincipal(request.principal)

        if (!isNil(flow.version.updatedBy) &&
            flow.version.updatedBy !== userId &&
            currentTime.diff(dayjs(flow.version.updated), 'minute') <= 1
        ) {
            return reply.status(StatusCodes.CONFLICT).send()
        }
        // END EE

        const updatedFlow = await flowService.update({
            id: request.params.id,
            userId,
            projectId: request.principal.projectId,
            operation: request.body,
        })
        return updatedFlow
    })

    app.get('/', ListFlowsRequestOptions, async (request) => {
        return flowService.list({
            projectId: request.principal.projectId,
            folderId: request.query.folderId,
            cursorRequest: request.query.cursor ?? null,
            limit: request.query.limit ?? DEFAULT_PAGE_SIZE,
            status: request.query.status,
        })
    })

    app.get('/count', CountFlowsRequestOptions, async (request) => {
        return flowService.count({
            folderId: request.query.folderId,
            projectId: request.principal.projectId,
        })
    })

    app.get('/:id/template', GetFlowTemplateRequestOptions, async (request) => {
        return flowService.getTemplate({
            flowId: request.params.id,
            projectId: request.principal.projectId,
            versionId: undefined,
        })
    })

    app.get('/:id', GetFlowRequestOptions, async (request) => {
        return flowService.getOnePopulatedOrThrow({
            id: request.params.id,
            projectId: request.principal.projectId,
            versionId: request.query.versionId,
        })
    })

    app.delete('/:id', DeleteFlowRequestOptions, async (request, reply) => {
        const flow = await flowService.getOnePopulatedOrThrow({
            id: request.params.id,
            projectId: request.principal.projectId,
        })
        eventsHooks.get().send(request, {
            action: ApplicationEventName.DELETED_FLOW,
            flow,
            userId: request.principal.id,
        })
        await flowService.delete({
            id: request.params.id,
            projectId: request.principal.projectId,
        })
        return reply.status(StatusCodes.NO_CONTENT).send()
    })
}

async function extractUserIdFromPrincipal(principal: Principal): Promise<string> {
    if (principal.type === PrincipalType.USER) {
        return principal.id
    }
    // TODO currently it's same as api service, but it's better to get it from api key service, in case we introduced more admin users
    const project = await projectService.getOneOrThrow(principal.projectId)
    return project.ownerId
}

const CreateFlowRequestOptions = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    },
    schema: {
        tags: ['flows'],
        description: 'Create a flow',
        body: CreateFlowRequest,
        response: {
            [StatusCodes.CREATED]: PopulatedFlow,
        },
    },
}

const UpdateFlowRequestOptions = {
    schema: {
        tags: ['flows'],
        description: 'Apply an operation to a flow',
        body: FlowOperationRequest,
        params: Type.Object({
            id: ApId,
        }),
    },
}



const ListFlowsRequestOptions = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    },
    schema: {
        tags: ['flows'],
        description: 'List flows',
        querystring: ListFlowsRequest,
        response: {
            [StatusCodes.OK]: SeekPage(PopulatedFlow),
        },
    },
}

const CountFlowsRequestOptions = {
    schema: {
        querystring: CountFlowsRequest,
    },
}

const GetFlowTemplateRequestOptions = {
    schema: {
        params: Type.Object({
            id: ApId,
        }),
        response: {
            [StatusCodes.OK]: FlowTemplateWithoutProjectInformation,
        },
    },
}

const GetFlowRequestOptions = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    },
    schema: {
        tags: ['flows'],
        description: 'Get a flow by id',
        params: Type.Object({
            id: ApId,
        }),
        querystring: GetFlowQueryParamsRequest,
        response: {
            [StatusCodes.OK]: PopulatedFlow,
        },
    },
}

const DeleteFlowRequestOptions = {
    config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    },
    schema: {
        tags: ['flows'],
        description: 'Delete a flow',
        params: Type.Object({
            id: ApId,
        }),
        response: {
            [StatusCodes.NO_CONTENT]: Type.Undefined(),
        },
    },
}
