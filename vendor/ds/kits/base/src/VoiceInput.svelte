<script lang="ts">
  import Button from "./Button.svelte";
  import Icon from "./Icon.svelte";
  import AudioMeter from "./AudioMeter.svelte";
  interface Props {
    /** Whether the application is currently recording. */
    recording: boolean;
    /** Linear input level from 0 to 1; ignored while not recording. */
    value?: number;
    /** Stable accessible control name. */
    label?: string;
    /** Called when the user requests starting or stopping recording. The host owns the state. */
    onrecordingchange?: (recording: boolean) => void;
    /** Prevent activation while recording is unavailable. */
    disabled?: boolean;
    /** Extra classes on the button. */
    class?: string;
  }
  const { recording, value = 0, label = "Voice input", onrecordingchange, disabled = false, class: className }: Props = $props();
</script>
<Button {disabled} size="sm" variant="secondary" class={className} aria-label={label} aria-pressed={recording} data-voice-input onclick={() => onrecordingchange?.(!recording)}>
  <Icon icon="mic" size="sm" color="current" aria-hidden="true" />
  {#if recording}<span aria-hidden="true"><AudioMeter {value} compact /></span>{/if}
</Button>
