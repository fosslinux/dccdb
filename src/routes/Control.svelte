<script>
    import Button from './ControlButton.svelte';
    
    const buttons = [
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
