<script lang="ts">
    import Empty from './EmptyState.svelte';
    import type { ComponentType } from 'svelte';

    const selections = new Map<string, ComponentType>([
        ["Variables", Empty],
        ["Functions", Empty],
    ]);

    let selection: ComponentType = Empty;
</script>

<div class="bg-fuchsia-900 grid grid-cols-6 grid-rows-1 w-full h-full">
    <div class="col-span-1 row-span-1 flex justify-center items-start p-3">
        <table class="border border-gray-500 w-full"><tbody>
            {#each selections.keys() as selection}
                <tr class="border-b border-gray-500"><td class="p-2">{selection}</td></tr>
            {/each}
        </tbody></table>
    </div>

    <div class="col-span-3 col-start-2 row-start-1 row-span-1">
        <svelte:component this={selection}/>
    </div>
</div>
