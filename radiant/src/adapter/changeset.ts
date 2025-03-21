import { green, yellow } from "yoctocolors"

export class Changeset {
  #added: string[]
  #updated: string[]

  constructor(added?: string[], updated?: string[]) {
    this.#added = added || []
    this.#updated = updated || []
  }

  addAddition(change: string) {
    this.#added.push(change)
  }

  addUpdate(change: string) {
    this.#updated.push(change)
  }

  getAdditions() {
    return this.#added
  }

  getUpdates() {
    return this.#updated
  }

  merge(changeset: Changeset) {
    this.#added = this.#added.concat(changeset.getAdditions())
    this.#updated = this.#updated.concat(changeset.getUpdates())
  }

  print() {
    this.printAdditions()
    this.printUpdates()
  }

  printAdditions() {
    if (this.#added.length === 0) {
      return
    }

    this.#added.forEach(change => {
      console.log(green(`+ Added: ${change}`))
    })
  }

  printUpdates() {
    if (this.#updated.length === 0) {
      return
    }

    this.#updated.forEach(change => {
      console.log(yellow(`~ Updated: ${change}`))
    })
  }
}