declare module "topojson-client" {
  import type { Feature, FeatureCollection, Geometry } from "geojson";
  import type { Topology } from "topojson-specification";

  export function feature<
    T extends GeometryObject = GeometryObject,
    U = Record<string, unknown>,
  >(
    topology: Topology,
    object: T,
  ): Feature<Geometry, U> | FeatureCollection<Geometry, U> | null;

  interface GeometryObject {
    type: string;
    arcs?: unknown;
    properties?: Record<string, unknown>;
    coordinates?: unknown;
    geometries?: unknown[];
  }
}
