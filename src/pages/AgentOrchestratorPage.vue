<script setup lang="ts">
import { computed, ref } from 'vue'
import CodeSnippet from '@/components/CodeSnippet.vue'
import ExperimentFooter from '@/components/experiment/ExperimentFooter.vue'
import ExperimentHeader from '@/components/experiment/ExperimentHeader.vue'
import { useApi } from '@/composables/useApi'

type AgentId = 'joke_agent' | 'soccer_agent' | 'portfolio_agent' | 'none'

type RouteDecision = {
  selected_agent: AgentId
  confidence: number
  reason: string
  normalized_query: string
}

type ToolCall = {
  id: string
  name: string
  args: Record<string, unknown>
  reason?: string
}

type TimelineEvent = {
  id: string
  type: string
  timestamp: string
  title: string
  detail: string
  raw?: unknown
}

type OrchestratorPayload = {
  type: string
  timestamp: string
  message?: string
  decision?: RouteDecision
  agent?: AgentId
  call?: ToolCall
  call_id?: string
  summary?: string
  raw?: unknown
  text?: string
}

const { sendOrchestratorMessage } = useApi()

const prompt = ref('Show 2024 Premier League standings')
const status = ref<'ready' | 'running' | 'error'>('ready')
const answer = ref('')
const decision = ref<RouteDecision | null>(null)
const activeAgent = ref<AgentId | null>(null)
const timeline = ref<TimelineEvent[]>([])
const error = ref('')

const examples = [
  'Tell me a dry joke about APIs',
  'Show 2024 Premier League standings',
  'Who were the top scorers in La Liga in 2024?',
  'What has Adrian built?',
]

const agents = [
  {
    id: 'joke_agent' as const,
    name: 'Joke Agent',
    icon: 'i-lucide-laugh',
    description: 'Pure generation for jokes, puns, and playful one-liners.',
    tools: 'No tools',
  },
  {
    id: 'soccer_agent' as const,
    name: 'Soccer Agent',
    icon: 'i-lucide-trophy',
    description: 'Fresh football data through API-Football.',
    tools: 'search_team, fixtures, standings, scorers',
  },
  {
    id: 'portfolio_agent' as const,
    name: 'Portfolio Agent',
    icon: 'i-lucide-user-round-search',
    description: 'Answers from local context about Adrian and this site.',
    tools: 'portfolio_search',
  },
]

const selectedAgentName = computed(() => {
  if (!activeAgent.value || activeAgent.value === 'none') return 'No specialist'
  return agents.find((agent) => agent.id === activeAgent.value)?.name ?? activeAgent.value
})

const confidenceLabel = computed(() => {
  if (!decision.value) return 'Waiting'
  return `${Math.round(decision.value.confidence * 100)}% confidence`
})

const canSubmit = computed(() => prompt.value.trim().length > 0 && status.value !== 'running')

const codeSnippets = {
  eventContract: `event: route_completed
data: {"type":"route_completed","decision":{"selected_agent":"soccer_agent","confidence":0.91}}

event: tool_call_started
data: {"type":"tool_call_started","call":{"name":"search_team","args":{"query":"Arsenal"}}}

event: agent_token
data: {"type":"agent_token","text":"Arsenal's next fixture is..."}`,
  endpoint: `@app.post("/api/orchestrator/message")
async def orchestrate_message(request: OrchestratorRequest):
    async def event_stream() -> AsyncIterator[str]:
        async for event in service.stream(request.prompt):
            event_type = event.get("type", "message")
            payload = json.dumps(event)
            yield f"event: {event_type}\\ndata: {payload}\\n\\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )`,
  orchestrator: `async def stream(self, prompt: str) -> AsyncIterator[dict[str, Any]]:
    yield self._event("route_started", {"message": "Routing prompt."})
    decision = await self._route(prompt)
    yield self._event("route_completed", {"decision": decision.model_dump(mode="json")})

    if decision.selected_agent == AgentId.soccer:
        async for event in self._stream_soccer_agent(decision.normalized_query):
            yield event
    elif decision.selected_agent == AgentId.portfolio:
        async for event in self._stream_portfolio_agent(decision.normalized_query):
            yield event
    elif decision.selected_agent == AgentId.joke:
        async for event in self._stream_joke_agent(decision.normalized_query):
            yield event

    yield self._event("done", {})`,
  soccerAgent: `async def _stream_soccer_agent(self, query: str) -> AsyncIterator[dict[str, Any]]:
    plan = await self._plan_soccer_tools(query)
    tool_results = []

    for item in plan.tool_calls[:MAX_TOOL_CALLS]:
        call_id = str(uuid4())
        yield self._event("tool_call_started", {"call": item.model_dump() | {"id": call_id}})
        result = await self._execute_soccer_tool(item)
        tool_results.append({"tool": item.model_dump(), "result": result})
        yield self._event("tool_call_completed", {
            "call_id": call_id,
            "summary": self._summarize_tool_result(item.name, result),
            "raw": result,
        })

    async for text in self._stream_text(self._soccer_messages(query, tool_results)):
        yield self._event("agent_token", {"text": text})`,
  toolSubset: `Allowed soccer tools:
- search_team(query)
- get_team_next_fixtures(team_id or team_query)
- get_team_recent_fixtures(team_id or team_query)
- search_league(query)
- get_league_standings(league_id or league_query, season)
- get_top_scorers(league_id or league_query, season)`,
}

const pushTimeline = (event: TimelineEvent) => {
  timeline.value.push(event)
}

const describePayload = (payload: OrchestratorPayload): TimelineEvent => {
  const base = {
    id: `${Date.now()}-${timeline.value.length}`,
    type: payload.type,
    timestamp: payload.timestamp,
  }

  if (payload.type === 'route_started') {
    return { ...base, title: 'Routing started', detail: payload.message ?? 'Router is deciding.' }
  }

  if (payload.type === 'route_completed' && payload.decision) {
    return {
      ...base,
      title: 'Router selected agent',
      detail: `${payload.decision.selected_agent} - ${payload.decision.reason}`,
      raw: payload.decision,
    }
  }

  if (payload.type === 'agent_selected') {
    return {
      ...base,
      title: 'Agent activated',
      detail: payload.agent === 'none' ? 'No agent matched this prompt.' : `${payload.agent}`,
    }
  }

  if (payload.type === 'tool_call_started' && payload.call) {
    return {
      ...base,
      title: `Tool started: ${payload.call.name}`,
      detail: payload.call.reason || JSON.stringify(payload.call.args),
      raw: payload.call,
    }
  }

  if (payload.type === 'tool_call_completed') {
    return {
      ...base,
      title: 'Tool completed',
      detail: payload.summary ?? 'Tool returned.',
      raw: payload.raw,
    }
  }

  if (payload.type === 'error') {
    return { ...base, title: 'Error', detail: payload.message ?? 'Unknown error', raw: payload }
  }

  if (payload.type === 'done') {
    return { ...base, title: 'Done', detail: 'Stream closed.' }
  }

  return { ...base, title: payload.type, detail: payload.text ?? payload.message ?? '' }
}

const handlePayload = (payload: OrchestratorPayload) => {
  if (payload.type === 'route_completed' && payload.decision) {
    decision.value = payload.decision
  }

  if (payload.type === 'agent_selected' && payload.agent) {
    activeAgent.value = payload.agent
  }

  if (payload.type === 'agent_token' && payload.text) {
    answer.value += payload.text
    return
  }

  if (payload.type === 'error') {
    error.value = payload.message ?? 'Unknown error'
    status.value = 'error'
  }

  pushTimeline(describePayload(payload))
}

const runPrompt = async (nextPrompt?: string) => {
  if (nextPrompt) prompt.value = nextPrompt
  if (!canSubmit.value) return

  status.value = 'running'
  answer.value = ''
  decision.value = null
  activeAgent.value = null
  timeline.value = []
  error.value = ''

  await sendOrchestratorMessage(
    prompt.value,
    ({ data }) => {
      try {
        handlePayload(JSON.parse(data) as OrchestratorPayload)
      } catch {
        error.value = 'Received an invalid stream event.'
        status.value = 'error'
      }
    },
    () => {
      if (status.value !== 'error') status.value = 'ready'
    },
    (message) => {
      error.value = message
      status.value = 'error'
    },
  )
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-12">
    <ExperimentHeader
      title="Agent Orchestrator"
      description="Watch a small router select one specialist, expose its tool calls, and stream the result through one visible event contract."
    />

    <section class="space-y-4">
      <div class="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface)] p-4">
        <div class="flex flex-col gap-3 lg:flex-row">
          <UInput
            v-model="prompt"
            class="min-w-0 flex-1"
            size="xl"
            placeholder="Ask for a joke, soccer data, or Adrian portfolio context"
            @keydown.enter.prevent="runPrompt()"
          />
          <UButton
            icon="i-lucide-play"
            size="xl"
            :loading="status === 'running'"
            :disabled="!canSubmit"
            @click="runPrompt()"
          >
            Run
          </UButton>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <UButton
            v-for="example in examples"
            :key="example"
            size="sm"
            variant="soft"
            color="neutral"
            @click="runPrompt(example)"
          >
            {{ example }}
          </UButton>
        </div>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)_24rem]">
      <aside class="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface)] p-4">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-base font-semibold text-[var(--site-ink)]">Agents</h2>
          <UBadge color="neutral" variant="soft">{{ selectedAgentName }}</UBadge>
        </div>
        <div class="space-y-3">
          <div
            v-for="agent in agents"
            :key="agent.id"
            class="rounded-md border p-3 transition-colors"
            :class="
              activeAgent === agent.id
                ? 'border-primary-400 bg-primary-50'
                : 'border-[var(--site-border)] bg-white'
            "
          >
            <div class="flex items-center gap-2">
              <UIcon :name="agent.icon" class="h-5 w-5 text-[var(--site-muted)]" />
              <h3 class="font-medium text-[var(--site-ink)]">{{ agent.name }}</h3>
            </div>
            <p class="mt-2 text-sm text-[var(--site-muted)]">{{ agent.description }}</p>
            <p class="mt-2 text-xs text-[var(--site-faint)]">{{ agent.tools }}</p>
          </div>
        </div>
      </aside>

      <main class="rounded-lg border border-[var(--site-border)] bg-white">
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--site-border)] p-4"
        >
          <div>
            <h2 class="font-semibold text-[var(--site-ink)]">Specialist response</h2>
            <p class="text-sm text-[var(--site-muted)]">{{ confidenceLabel }}</p>
          </div>
          <UBadge v-if="status === 'running'" color="primary" variant="soft">Streaming</UBadge>
          <UBadge v-else-if="status === 'error'" color="error" variant="soft">Error</UBadge>
          <UBadge v-else color="neutral" variant="soft">Ready</UBadge>
        </div>
        <div class="min-h-[26rem] p-5">
          <div
            v-if="decision"
            class="mb-4 rounded-md border border-[var(--site-border)] bg-[var(--site-surface)] p-3"
          >
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <UBadge color="primary" variant="soft">{{ decision.selected_agent }}</UBadge>
              <span class="text-[var(--site-muted)]">{{ confidenceLabel }}</span>
            </div>
            <p class="mt-2 text-sm text-[var(--site-muted)]">{{ decision.reason }}</p>
          </div>

          <p v-if="answer" class="whitespace-pre-wrap text-base leading-7 text-[var(--site-ink)]">
            {{ answer }}
          </p>
          <p v-else-if="status === 'running'" class="text-[var(--site-muted)]">
            Waiting for the selected agent...
          </p>
          <p v-else class="text-[var(--site-muted)]">
            Run a prompt to see routing, tool calls, and streamed output.
          </p>

          <UAlert
            v-if="error"
            class="mt-4"
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            title="Orchestrator error"
            :description="error"
          />
        </div>
      </main>

      <aside class="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface)] p-4">
        <h2 class="font-semibold text-[var(--site-ink)]">Execution timeline</h2>
        <div class="mt-4 space-y-3">
          <div
            v-for="event in timeline"
            :key="event.id"
            class="rounded-md border border-[var(--site-border)] bg-white p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-[var(--site-ink)]">{{ event.title }}</p>
                <p class="mt-1 text-sm text-[var(--site-muted)]">{{ event.detail }}</p>
              </div>
              <UBadge size="sm" color="neutral" variant="soft">{{ event.type }}</UBadge>
            </div>
            <details v-if="event.raw" class="mt-2">
              <summary class="cursor-pointer text-xs text-[var(--site-muted)]">Raw JSON</summary>
              <pre
                class="mt-2 max-h-56 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100"
              ><code>{{ JSON.stringify(event.raw, null, 2) }}</code></pre>
            </details>
          </div>
          <p v-if="!timeline.length" class="text-sm text-[var(--site-muted)]">
            Stream events will appear here as the backend emits them.
          </p>
        </div>
      </aside>
    </section>

    <section class="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="min-w-0 space-y-8">
        <div>
          <h2 class="text-2xl font-semibold text-[var(--site-ink)]">How the Orchestrator Works</h2>
          <div class="prose prose-slate mt-3 max-w-none">
            <p>
              The endpoint receives one prompt, asks a cheap router model for a strict decision,
              activates one specialist agent, and streams every state transition as Server-Sent
              Events. The UI treats those events as a trace rather than hiding orchestration behind
              a single loading spinner.
            </p>
            <p>
              Soccer requests use API-Football through a backend service. Portfolio requests call a
              local context search tool. Joke requests are pure generation, which keeps the contrast
              between agents easy to see.
            </p>
          </div>
        </div>

        <div>
          <h3 class="text-xl font-semibold text-[var(--site-ink)]">Execution Diagram</h3>
          <div
            class="mt-4 min-w-0 rounded-lg border border-[var(--site-border)] bg-[var(--site-surface)] p-3 sm:p-6"
          >
            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div
                class="min-w-0 rounded-md border border-[var(--site-border)] bg-[var(--site-bg)] p-3 sm:p-4"
              >
                <div class="flex min-w-0 items-start gap-3 sm:items-center">
                  <span
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--site-border)] bg-[var(--site-surface-soft)] text-[var(--site-accent)]"
                  >
                    <UIcon name="i-lucide-message-square" class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="font-medium text-[var(--site-ink)]">Prompt</p>
                    <p class="text-wrap text-sm leading-6 text-[var(--site-muted)]">
                      The browser posts one user question to FastAPI.
                    </p>
                  </div>
                </div>
              </div>

              <div
                class="min-w-0 rounded-md border border-[var(--site-border)] bg-[var(--site-bg)] p-3 sm:p-4"
              >
                <div class="flex min-w-0 items-start gap-3 sm:items-center">
                  <span
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--site-border)] bg-[var(--site-surface-soft)] text-[var(--site-accent)]"
                  >
                    <UIcon name="i-lucide-route" class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="font-medium text-[var(--site-ink)]">Router model</p>
                    <p class="text-wrap text-sm leading-6 text-[var(--site-muted)]">
                      A cheap model returns one selected agent, confidence, and public rationale.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="my-4 flex items-center justify-center text-[var(--site-faint)]">
              <UIcon name="i-lucide-arrow-down" class="h-5 w-5" />
            </div>

            <div class="grid min-w-0 gap-3 lg:grid-cols-3">
              <div
                class="min-w-0 rounded-md border border-[var(--site-border)] bg-white p-3 sm:p-4"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <UIcon name="i-lucide-laugh" class="h-4 w-4 text-[var(--site-accent)]" />
                  <p class="font-medium text-[var(--site-ink)]">Joke Agent</p>
                </div>
                <p class="mt-2 text-wrap text-sm leading-6 text-[var(--site-muted)]">
                  No tools. The specialist streams a short generated answer.
                </p>
              </div>

              <div
                class="min-w-0 rounded-md border border-[var(--site-border)] bg-white p-3 sm:p-4"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <UIcon name="i-lucide-trophy" class="h-4 w-4 text-[var(--site-accent)]" />
                  <p class="font-medium text-[var(--site-ink)]">Soccer Agent</p>
                </div>
                <p class="mt-2 text-wrap text-sm leading-6 text-[var(--site-muted)]">
                  Plans up to three tool calls, queries API-Football, then summarizes returned data.
                </p>
              </div>

              <div
                class="min-w-0 rounded-md border border-[var(--site-border)] bg-white p-3 sm:p-4"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <UIcon
                    name="i-lucide-user-round-search"
                    class="h-4 w-4 text-[var(--site-accent)]"
                  />
                  <p class="font-medium text-[var(--site-ink)]">Portfolio Agent</p>
                </div>
                <p class="mt-2 text-wrap text-sm leading-6 text-[var(--site-muted)]">
                  Calls local portfolio search, then answers from Adrian's site context.
                </p>
              </div>
            </div>

            <div class="my-4 flex items-center justify-center text-[var(--site-faint)]">
              <UIcon name="i-lucide-arrow-down" class="h-5 w-5" />
            </div>

            <div
              class="min-w-0 rounded-md border border-[var(--site-border)] bg-[var(--site-bg)] p-3 text-sm leading-6 text-[var(--site-muted)] sm:p-4"
            >
              <div class="flex min-w-0 items-center gap-2 font-medium text-[var(--site-ink)]">
                <UIcon name="i-lucide-radio" class="h-4 w-4 text-[var(--site-accent)]" />
                Server-Sent Events
              </div>
              <p class="mt-2 text-wrap">
                The endpoint streams route events, agent selection, tool activity, answer tokens,
                errors, and completion as named events for the workbench timeline.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-xl font-semibold text-[var(--site-ink)]">Streaming Contract</h3>
          <CodeSnippet class="mt-3" :code="codeSnippets.eventContract" language="sse" />
        </div>

        <div>
          <h3 class="text-xl font-semibold text-[var(--site-ink)]">FastAPI Stream Endpoint</h3>
          <p class="mt-2 max-w-3xl text-[var(--site-muted)]">
            The route wraps the orchestrator generator in FastAPI's
            <code>StreamingResponse</code>. Each yielded event is framed as Server-Sent Events so
            the browser can distinguish routing, tools, tokens, errors, and completion.
          </p>
          <CodeSnippet class="mt-3" :code="codeSnippets.endpoint" language="python" />
        </div>

        <div>
          <h3 class="text-xl font-semibold text-[var(--site-ink)]">Orchestrator Dispatch</h3>
          <p class="mt-2 max-w-3xl text-[var(--site-muted)]">
            The orchestrator does not answer directly. It emits the routing decision, activates one
            specialist, forwards that agent's stream, then emits a final completion event.
          </p>
          <CodeSnippet class="mt-3" :code="codeSnippets.orchestrator" language="python" />
        </div>

        <div>
          <h3 class="text-xl font-semibold text-[var(--site-ink)]">Soccer Subagent</h3>
          <p class="mt-2 max-w-3xl text-[var(--site-muted)]">
            The soccer agent is the most complete specialist: it plans a bounded tool sequence,
            streams each API-Football call, stores tool results, then asks the model to summarize
            only what the tools returned.
          </p>
          <CodeSnippet class="mt-3" :code="codeSnippets.soccerAgent" language="python" />
        </div>

        <div>
          <h3 class="text-xl font-semibold text-[var(--site-ink)]">Soccer Tool Boundary</h3>
          <CodeSnippet class="mt-3" :code="codeSnippets.toolSubset" language="text" />
        </div>
      </div>

      <aside class="space-y-4">
        <UAlert
          icon="i-lucide-key-round"
          color="neutral"
          variant="soft"
          title="Required secrets"
          description="The backend reads OPENAI_API_KEY and API_FOOTBALL_KEY from environment variables."
        />
        <UAlert
          icon="i-lucide-book-open"
          color="primary"
          variant="soft"
          title="API-Football docs"
          description="The soccer service follows the API-SPORTS Football v3 authentication and endpoint model. On the free plan, available football data is limited to the 2022-2024 seasons."
          :actions="[
            {
              label: 'Open docs',
              to: 'https://api-sports.io/documentation/football/v3',
              target: '_blank',
              icon: 'i-lucide-external-link',
              class:
                'bg-[var(--site-accent)] !text-[var(--site-bg)] hover:bg-[oklch(0.37_0.045_170)]',
            },
          ]"
        />
      </aside>
    </section>

    <ExperimentFooter
      conclusion="A small router stays understandable when selection, tool execution, and output share one explicit event contract. The trace becomes part of the product instead of hidden backend behavior."
      :links="[
        {
          label: 'View the repository',
          href: 'https://github.com/willylatorre/adrianlatorre.com',
          external: true,
        },
        {
          label: 'OpenAI function calling guide',
          href: 'https://developers.openai.com/api/docs/guides/function-calling',
          external: true,
        },
      ]"
    />
  </div>
</template>
