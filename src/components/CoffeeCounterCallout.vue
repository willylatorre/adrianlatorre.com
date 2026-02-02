<template>
  <div class="flex justify-center">
    <div class="relative inline-flex items-center justify-center">
      <svg
        class="absolute -top-10 -left-24 h-16 w-28 text-amber-500"
        width="120"
        height="60"
        viewBox="0 0 120 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M10,10 C30,50 80,50 100,15"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          fill="transparent"
        />
        <path
          d="M85,20 L100,15 L105,30"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="transparent"
        />
      </svg>
      <CoffeeCounter />
    </div>
  </div>
</template>
