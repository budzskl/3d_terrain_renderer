# WebGL Terrain Renderer

A real-time 3D terrain renderer with per-pixel Phong lighting. Built for my Computer Graphics course at UIC.


---

## About

This project renders 3D terrain from heightmap data with real-time lighting. You can:

- Load heightmaps (images or 32-bit `.BSQ` files)
- Adjust terrain height dynamically
- Switch between directional and point light sources
- Control light position/direction in real-time
- Toggle between Phong shading and normal visualization (debugging mode)
- Pan, rotate, and zoom the camera with mouse controls

The lighting is calculated per-pixel in the fragment shader using the Phong reflection model (ambient + diffuse + specular).

---

## Demo

| Phong Shading | Normal Visualization |
| --- | --- |

---

## Technical Implementation

### Graphics Pipeline
- **Vertex Shader**: Transforms positions and normals, passes data to fragment shader
- **Fragment Shader**: Calculates per-pixel Phong lighting (ambient + diffuse + specular)
- **Index Buffers**: Eliminates duplicate vertices, reduces memory usage

### Lighting Model (Phong)
```
I = I_ambient + I_diffuse + I_specular

I_diffuse = I_light * k_d * (N · L)
I_specular = I_light * k_s * (R · V)^shininess
```
Where:
- `N` = surface normal
- `L` = light direction
- `R` = reflection vector
- `V` = view direction

### Normal Computation
For each vertex shared by multiple triangles:
1. Calculate face normal for each triangle using cross product
2. Average all face normals at the vertex
3. Normalize the result
4. Apply proper transformation matrix (handles non-uniform scaling)

### Why Index Buffers?
Without index buffers, every triangle needs 3 separate vertices even if they share positions with adjacent triangles. With index buffers:
- Vertices are stored once
- Triangles reference vertex indices
- Less memory, better performance

---

## Tech Stack

- **WebGL** - Graphics API
- **GLSL** - Shader language
- **JavaScript** - Application logic and heightmap loading

---

## Project Roadmap

- [x] Load heightmaps from images and `.BSQ` files
- [x] Implement index buffers for mesh optimization
- [x] Compute accurate surface normals with averaging
- [x] Build per-pixel Phong lighting in fragment shader
- [x] Add directional and point light support
- [x] Implement camera controls (pan, rotate, zoom)
- [x] Add normal visualization mode for debugging

---

## What I Learned

- How to write GLSL shaders for lighting calculations
- Proper normal transformation for non-uniform scaling
- Why index buffers matter for performance
- Per-pixel vs per-vertex lighting differences
- Working with transformation matrices in 3D graphics

---

## License

Developed as part of Computer Graphics at the University of Illinois Chicago.

---

**Author**: Dawid Budz  
**Email**: dawidbudz01@gmail.com  
**LinkedIn**: [linkedin.com/in/dawidbudz](https://linkedin.com/in/dawidbudz)
