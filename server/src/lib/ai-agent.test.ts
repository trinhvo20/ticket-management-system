import { beforeEach, describe, expect, it, mock } from 'bun:test'

const findUniqueMock = mock()
const findUniqueOrThrowMock = mock()
const createUserMock = mock()

mock.module('./prisma', () => ({
  prisma: {
    user: { findUnique: findUniqueMock, findUniqueOrThrow: findUniqueOrThrowMock },
  },
}))
mock.module('./auth', () => ({
  auth: {
    $context: Promise.resolve({
      internalAdapter: { createUser: createUserMock },
    }),
  },
}))

const { AI_AGENT_EMAIL, AI_AGENT_NAME, getAiAgentId, ensureAiAgentUser } = await import('./ai-agent')

beforeEach(() => {
  findUniqueMock.mockReset()
  findUniqueOrThrowMock.mockReset()
  createUserMock.mockReset()
})

describe('getAiAgentId', () => {
  it('looks up the AI agent user by its well-known email', async () => {
    findUniqueOrThrowMock.mockResolvedValueOnce({ id: 'ai-user-1' })

    const id = await getAiAgentId()

    expect(id).toBe('ai-user-1')
    expect(findUniqueOrThrowMock).toHaveBeenCalledWith({
      where: { email: AI_AGENT_EMAIL },
      select: { id: true },
    })
  })
})

describe('ensureAiAgentUser', () => {
  it('creates the AI agent user when it does not exist', async () => {
    findUniqueMock.mockResolvedValueOnce(null)

    await ensureAiAgentUser()

    expect(createUserMock).toHaveBeenCalledWith({
      email: AI_AGENT_EMAIL,
      name: AI_AGENT_NAME,
      emailVerified: true,
      role: 'agent',
    })
  })

  it('does nothing when the AI agent user already exists', async () => {
    findUniqueMock.mockResolvedValueOnce({ id: 'ai-user-1' })

    await ensureAiAgentUser()

    expect(createUserMock).not.toHaveBeenCalled()
  })
})
