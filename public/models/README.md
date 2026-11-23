# TR-style car models (original non-trademark tribute)

`tr_cab.glb` (cab car) and `tr_mid.glb` (intermediate car) are built by
`scripts/blender/tr_car.py`. They are an **original non-trademark tribute** to the
Toronto Rocket fleet: stainless body, a generic red band, dark glass and black rubber.
There is no logo, wordmark, roundel or fleet number, and the destination sign is a
blank dark panel.

| Dimension | Value | Basis |
|---|---|---|
| Length over couplers | 23.2 m | ESTIMATE: public approximate TR figure (in game the cars sit on a 23.0 m pitch, 138 m / 6) |
| Carbody length | 22.7 m | ESTIMATE: over couplers minus coupler reach |
| Body width | 3.13 m | ESTIMATE: public approximate figure |
| Roof height above rail | 3.65 m | ESTIMATE: public approximate figure |
| Floor height above rail | 1.10 m | ESTIMATE: level boarding at platform height |
| Door pairs per side | 4, 1.3 m wide | ESTIMATE: public photos |
| Bogie centres | 16.1 m | ESTIMATE |
| Wheel diameter | 0.71 m | ESTIMATE |
| Track gauge | 1495 mm | Documented TTC gauge (4 ft 10 7/8 in) |
| Windscreen rake, window band, red band heights | see script constants | ESTIMATE: styling from public photos, not a drawing |

Stats from the 2026-11-22 build: tr_cab 1 782 triangles, 97 KB; tr_mid 1 548 triangles,
82 KB. Materials are Principled BSDF / glTF PBR only: stainless (metallic 0.9,
roughness 0.35), door stainless, red band, dark glass, black rubber, underframe, roof
grey, plus emissive head and tail lamps.

Axes: origin at rail level at the car centre. The front points to glTF +Z, which matches
`Train.ts` (`car.lookAt(front)` aims +Z at the front). The exporter uses `export_yup=True`.

Rebuild (headless, about 5 s without the preview):

```sh
flock /tmp/nigian-heavy-tests.lock blender -b --factory-startup -P scripts/blender/tr_car.py -- --out public/models
# optional Cycles preview (CPU, about 15 s): add --preview docs/images/tr-preview.png [--cam x,y,z] [--samples 128]
```

Preview: `docs/images/tr-preview.png`.
