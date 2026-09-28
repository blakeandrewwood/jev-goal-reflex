import type { BoxEntity } from "./entity";

/** The entities in the world. */
export class Scene {
  readonly entities: BoxEntity[] = [];

  add(entity: BoxEntity) {
    this.entities.push(entity);
  }
}
