# Welcome experience

`HomeExperience` owns the public URL entry, fee disclosure, service explanation and FAQ. `ParcelWorld` progressively loads the Three.js scene and keeps the existing SVG available until the first successful frame.

`parcel-studio.ts` builds a miniature packing studio inspired by the owner's supplied diorama and glossy character references: a thick blue platform, coral arch, rounded parcel with cheeks/mittens/feet, a conveyor and an airplane. Models are real lit geometry, viewed with a perspective camera. Locally generated room reflections, physical materials and shadows establish depth. The user's reference files are not published as site assets.

`parcel-renderer.ts` obtains one WebGL2 context before constructing Three.js and passes that exact context to the renderer. Missing or throwing driver contexts return the fallback without invoking Three.js's failing constructor. The application does not force-enable a user's GPU. `parcel-scene.ts` owns lifecycle, lights, camera and pointer parallax; it releases geometries, textures, materials, environment target, shadow maps, observers/listeners and renderer on disposal or context loss.

The entrance lasts four seconds and settles. Pointer interaction renders for a bounded interval; reduced motion immediately displays the final pose without pointer animation. Hidden/offscreen views stop scheduling frames. Focusing the URL input lifts the lid; no rotation buttons or shipment-tracking claims are present. Forms work with or without WebGL.

Tests cover null/throwing contexts, successful context reuse and bounded motion. Browser journeys check a real canvas, reduced motion, pointer settling, context loss, Chromium with WebGL disabled, responsive layout and console/bundle errors.
