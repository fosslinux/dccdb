<script lang="ts">
    import Highlight, { LineNumbers } from "svelte-highlight";
    import c from "svelte-highlight/languages/c";
    import darcula from "svelte-highlight/styles/darcula";
    import { getContext } from 'svelte';

    export const code = getContext('code');
    export let location: {file: string, line: number} = {file: "", line: 1};
</script>

<svelte:head>
    {@html darcula}
</svelte:head>

<div class="font-mono leading-7 h-full w-full overflow-y-scroll" style="background-color: #2b2b2b">
    <Highlight language={c} {code} let:highlighted>
        <LineNumbers
            {highlighted}
            highlightedLines={[location.line]}
            --highlighted-background="#15803d"
        />
    </Highlight>
</div>
