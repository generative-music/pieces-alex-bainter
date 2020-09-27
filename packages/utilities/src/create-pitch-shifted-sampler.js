import * as Tone from 'tone';
import sampleNote from './sample-note';
import createBuffers from './create-buffers';

const createPitchShiftedSampler = async ({
  samplesByNote,
  pitchShift = 0,
  attack,
  release,
  volume = 0,
} = {}) => {
  let isDisposed = false;
  const output = new Tone.Volume(volume);
  const buffers = await createBuffers(samplesByNote);
  const activeSources = [];
  const sampledNotes = Object.keys(samplesByNote);

  const wrapMethodWithDisposeError = method => (...args) => {
    if (isDisposed) {
      throw Error(
        `Function ${
          method.name
        } was called after the sampler was already disposed`
      );
    }
    method(...args);
  };

  const triggerAttack = (note, time) => {
    const { sampledNote, playbackRate } = sampleNote({
      note,
      pitchShift,
      sampledNotes,
    });
    const bufferSource = new Tone.ToneBufferSource(
      buffers.get(sampledNote)
    ).connect(output);
    activeSources.push(bufferSource);
    bufferSource.set({
      playbackRate,
      onended: () => {
        console.log('ending');
        const index = activeSources.indexOf(bufferSource);
        if (index >= 0) {
          activeSources.splice(index, 1);
        }
      },
      fadeIn: attack,
      fadeOut: release,
    });
    bufferSource.start(time);
  };

  const connect = node => {
    output.connect(node);
  };

  const dispose = () => {
    isDisposed = true;
    activeSources.forEach(node => node.dispose());
    buffers.dispose();
    output.dispose();
  };

  const releaseAll = () => {
    activeSources.forEach(node => {
      node.dispose();
    });
  };

  return {
    triggerAttack: wrapMethodWithDisposeError(triggerAttack),
    connect: wrapMethodWithDisposeError(connect),
    dispose: wrapMethodWithDisposeError(dispose),
    releaseAll: wrapMethodWithDisposeError(releaseAll),
  };
};

export default createPitchShiftedSampler;