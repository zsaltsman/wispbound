import Phaser from 'phaser';

// Final-pass shader for the battle camera: converts everything to luminance and
// quantises it to the 5-shade palette with ordered (Bayer) dithering, so fog,
// fades, rotation and flashes always come out as authentic monochrome pixels.

const FRAG = `
#define SHADER_NAME GB_FS
precision highp float;
uniform sampler2D uMainSampler;
uniform float uFlash;
uniform float uInvert;
uniform float uDark;
uniform vec2 uRes;
varying vec2 outTexCoord;

float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { a = mod(floor(a), 4.0); return bayer2(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  // snap to texel centres: the render target is linearly filtered
  vec2 uv = (floor(outTexCoord * uRes) + 0.5) / uRes;
  vec4 c = texture2D(uMainSampler, uv);
  float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  l = mix(l, 1.0 - l, uInvert);
  l = l * (1.0 - uDark) + uFlash;
  float d = bayer4(gl_FragCoord.xy);
  float q = floor(clamp(l, 0.0, 1.0) * 4.0 + 0.03 + d * 0.94) / 4.0;
  gl_FragColor = vec4(vec3(clamp(q, 0.0, 1.0)), 1.0);
}
`;

export class GBPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  flash = 0;
  invert = 0;
  dark = 0;

  constructor(game: Phaser.Game) {
    super({ game, name: 'GBPipeline', fragShader: FRAG });
  }

  onPreRender() {
    this.set1f('uFlash', this.flash);
    this.set1f('uInvert', this.invert);
    this.set1f('uDark', this.dark);
    this.set2f('uRes', this.renderer.width, this.renderer.height);
  }
}
