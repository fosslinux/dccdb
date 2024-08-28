<script lang="ts">
    import "../app.css";
    import { setContext } from 'svelte';
    import { page } from '$app/stores';

    export let data;
    setContext('code', data.code);
    setContext('session', $page.url.searchParams.get('session'));

    import Control from './Control.svelte';
    import Code from './Code.svelte';
    import Output from './Output.svelte';
    import ExecState from './ExecState.svelte';
</script>

<div class="grid grid-cols-11 grid-rows-10 gap-1 bg-fuchsia-950 h-screen w-screen text-white text-sm overflow-hidden">
    <div class="row-span-10 rounded"><Control/></div>
    <div class="col-span-5 row-span-10 rounded"><Code/></div>
    <div class="col-span-5 row-span-5 col-start-7 p-4 rounded"><Output/></div>
    <div class="col-span-5 row-span-5 col-start-7 row-start-6 rounded"><ExecState/></div>
</div>
