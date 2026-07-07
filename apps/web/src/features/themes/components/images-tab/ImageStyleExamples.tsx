const STYLE_EXAMPLES = [
  {
    image: '/Component_images/Theme/imageprompt_1.png',
    subject: 'A paper airplane soaring upward,',
    style:
      '3D render, smooth surfaces, soft shadows, futuristic, glass and metal materials, tech aesthetic',
  },
  {
    image: '/Component_images/Theme/imageprompt_2.png',
    subject: 'A paper airplane soaring upward,',
    style:
      'watercolor painting, soft washes, dreamy atmosphere, artistic, flowing brushstrokes, organic',
  },
  {
    image: '/Component_images/Theme/imageprompt_3.png',
    subject: 'A paper airplane soaring upward,',
    style: 'minimalist illustration, single line art, bold colors, negative space, zen simplicity',
  },
  {
    image: '/Component_images/Theme/imageprompt_4.png',
    subject: 'A paper airplane soaring upward,',
    style:
      'claymation style, soft clay texture, warm pastel colors, friendly, approachable, handcrafted feel',
  },
  {
    image: '/Component_images/Theme/imageprompt_5.png',
    subject: 'A paper airplane soaring upward,',
    style:
      'abstract geometric shapes, illustration, vibrant gradients, modern startup aesthetic, flat design',
  },
  {
    image: '/Component_images/Theme/imageprompt_6.png',
    subject: 'A paper airplane soaring upward,',
    style:
      'professional photography, soft lighting, minimal background, clean white space, editorial style',
  },
]

export function ImageStyleExamples() {
  return (
    <div className="space-y-spacing-3">
      <label className="body-3 block font-medium text-muted-foreground">Examples:</label>
      <div className="gap-x-spacing-4 gap-y-spacing-6 grid grid-cols-3">
        {STYLE_EXAMPLES.map((example, index) => (
          <div key={index} className="space-y-spacing-2">
            <div className="rounded-spacing-2 bg-muted-20 aspect-square overflow-hidden">
              <img
                src={example.image}
                alt={`Style example ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
            <p className="typo-caption leading-relaxed">
              <span className="text-muted-foreground">{example.subject}</span>{' '}
              <span className="font-medium text-foreground">{example.style}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
