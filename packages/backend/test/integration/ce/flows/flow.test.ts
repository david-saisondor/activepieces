import { databaseConnection } from '../../../../src/app/database/database-connection'
import { setupApp } from '../../../../src/app/app'
import { generateMockToken } from '../../../helpers/auth'
import { createMockUser, createMockProject, createMockFlow, createMockFlowVersion } from '../../../helpers/mocks'
import { StatusCodes } from 'http-status-codes'
import { FastifyInstance } from 'fastify'
import { FlowStatus, PrincipalType } from '@activepieces/shared'

let app: FastifyInstance | null = null

beforeAll(async () => {
    await databaseConnection.initialize()
    app = await setupApp()
})

afterAll(async () => {
    await databaseConnection.destroy()
    await app?.close()
})

describe('Flow API', () => {
    describe('Create Flow endpoint', () => {
        it('Adds an empty flow', async () => {
            // arrange
            const mockUser = createMockUser()
            await databaseConnection.getRepository('user').save([mockUser])

            const mockProject = createMockProject({ ownerId: mockUser.id })
            await databaseConnection.getRepository('project').save([mockProject])

            const mockToken = await generateMockToken({ type: PrincipalType.USER, projectId: mockProject.id })

            const mockCreateFlowRequest = {
                displayName: 'test flow',
            }

            // act
            const response = await app?.inject({
                method: 'POST',
                url: '/v1/flows',
                headers: {
                    authorization: `Bearer ${mockToken}`,
                },
                body: mockCreateFlowRequest,
            })

            // assert
            expect(response?.statusCode).toBe(StatusCodes.CREATED)
            const responseBody = response?.json()

            expect(Object.keys(responseBody)).toHaveLength(9)
            expect(responseBody?.id).toHaveLength(21)
            expect(responseBody?.created).toBeDefined()
            expect(responseBody?.updated).toBeDefined()
            expect(responseBody?.projectId).toBe(mockProject.id)
            expect(responseBody?.folderId).toBeNull()
            expect(responseBody?.status).toBe('DISABLED')
            expect(responseBody?.publishedVersionId).toBeNull()
            expect(responseBody?.schedule).toBeNull()

            expect(Object.keys(responseBody?.version)).toHaveLength(9)
            expect(responseBody?.version?.id).toHaveLength(21)
            expect(responseBody?.version?.created).toBeDefined()
            expect(responseBody?.version?.updated).toBeDefined()
            expect(responseBody?.version?.updatedBy).toBeNull()
            expect(responseBody?.version?.flowId).toBe(responseBody?.id)
            expect(responseBody?.version?.displayName).toBe('test flow')
            expect(Object.keys(responseBody?.version?.trigger)).toHaveLength(5)
            expect(responseBody?.version?.trigger.type).toBe('EMPTY')
            expect(responseBody?.version?.trigger.name).toBe('trigger')
            expect(responseBody?.version?.trigger.settings).toMatchObject({})
            expect(responseBody?.version?.trigger.valid).toBe(false)
            expect(responseBody?.version?.trigger.displayName).toBe('Select Trigger')
            expect(responseBody?.version?.valid).toBe(false)
            expect(responseBody?.version?.state).toBe('DRAFT')
        })
    })

    describe('Update status endpoint', () => {
        it('Enables a disabled Flow', async () => {
            // arrange
            const mockUser = createMockUser()
            await databaseConnection.getRepository('user').save([mockUser])

            const mockProject = createMockProject({ ownerId: mockUser.id })
            await databaseConnection.getRepository('project').save([mockProject])

            const mockFlow = createMockFlow({ projectId: mockProject.id, status: FlowStatus.DISABLED })
            await databaseConnection.getRepository('flow').save([mockFlow])

            const mockFlowVersion = createMockFlowVersion({ flowId: mockFlow.id, updatedBy: mockUser.id })
            await databaseConnection.getRepository('flow_version').save([mockFlowVersion])

            await databaseConnection.getRepository('flow').update(mockFlow.id, {
                publishedVersionId: mockFlowVersion.id,
            })

            const mockToken = await generateMockToken({ type: PrincipalType.USER, projectId: mockProject.id })

            const mockUpdateFlowStatusRequest = {
                status: 'ENABLED',
            }

            // act
            const response = await app?.inject({
                method: 'POST',
                url: `/v1/flows/${mockFlow.id}/status`,
                headers: {
                    authorization: `Bearer ${mockToken}`,
                },
                body: mockUpdateFlowStatusRequest,
            })

            // assert
            expect(response?.statusCode).toBe(StatusCodes.OK)
            const responseBody = response?.json()

            expect(Object.keys(responseBody)).toHaveLength(8)
            expect(responseBody?.id).toBe(mockFlow.id)
            expect(responseBody?.created).toBeDefined()
            expect(responseBody?.updated).toBeDefined()
            expect(responseBody?.projectId).toBe(mockProject.id)
            expect(responseBody?.folderId).toBeNull()
            expect(responseBody?.status).toBe('ENABLED')
            expect(responseBody?.publishedVersionId).toBe(mockFlowVersion.id)
            expect(responseBody?.schedule).toBeNull()
        })
    })
})
