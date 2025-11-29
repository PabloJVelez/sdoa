import { model } from "@medusajs/framework/utils"
import { Course } from "./course"
import { MenuImage } from "./menu-image"

export const Menu = model.define("menu", {
  name: model.text(),
  id: model.id().primaryKey(),
  courses: model.hasMany(() => Course),
  images: model.hasMany(() => MenuImage),
  thumbnail: model.text().nullable(),
}).cascades({
  delete: ["courses", "images"]
})