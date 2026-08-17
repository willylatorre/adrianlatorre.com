<script setup lang="ts">
export type ExperimentLink = {
  label: string
  href: string
  external?: boolean
}

defineProps<{
  conclusion: string
  links: ExperimentLink[]
}>()
</script>

<template>
  <footer class="experiment-footer">
    <section aria-labelledby="experiment-conclusion-title">
      <h2 id="experiment-conclusion-title">What I learned</h2>
      <p>{{ conclusion }}</p>
    </section>

    <nav aria-labelledby="experiment-links-title">
      <h2 id="experiment-links-title">Notes &amp; links</h2>
      <ul>
        <li v-for="link in links" :key="`${link.href}-${link.label}`">
          <a
            v-if="link.external"
            :href="link.href"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ link.label }}
            <UIcon name="i-lucide-external-link" aria-hidden="true" />
          </a>
          <RouterLink v-else :to="link.href">
            {{ link.label }}
            <UIcon name="i-lucide-arrow-up-right" aria-hidden="true" />
          </RouterLink>
        </li>
      </ul>
    </nav>
  </footer>
</template>

<style scoped>
.experiment-footer {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(14rem, 0.65fr);
  gap: clamp(2rem, 6vw, 5rem);
  margin-top: clamp(4.5rem, 9vw, 7rem);
  padding: clamp(1.75rem, 4vw, 2.75rem) 0 0.75rem;
  border-top: 1px solid var(--site-border);
}

.experiment-footer section,
.experiment-footer nav {
  min-width: 0;
}

h2 {
  margin: 0;
  color: var(--site-faint);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

p {
  max-width: 62ch;
  margin: 0.8rem 0 0;
  color: var(--site-muted);
  font-size: 0.94rem;
  line-height: 1.72;
}

ul {
  display: grid;
  gap: 0.65rem;
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
}

a {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--site-muted);
  font-size: 0.86rem;
  line-height: 1.5;
  text-decoration: none;
}

a:hover {
  color: var(--site-ink);
}

a:focus-visible {
  border-radius: 0.2rem;
  outline: 2px solid var(--site-accent);
  outline-offset: 3px;
}

a svg {
  width: 0.8rem;
  height: 0.8rem;
  flex: 0 0 auto;
}

@media (max-width: 680px) {
  .experiment-footer {
    grid-template-columns: 1fr;
  }
}
</style>
