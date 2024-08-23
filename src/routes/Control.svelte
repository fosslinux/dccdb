<script lang="ts">
    import Button from './ControlButton.svelte';
    
    const buttons: {text: string}[] = [
        {
            text: "hello",
        },
    ];
</script>

<div class="bg-purple-900 flex flex-col space-y-4">
    {#each buttons as button}
        <Button {...button} />
    {/each}
</div>
