import fs from "node:fs"
import path from "node:path"

export type ArtifactKind = "unknown" | "memory" | "disk"

export abstract class Artifact {
  readonly filepath: string
  readonly kind: ArtifactKind = "unknown"

  constructor(filepath: string) {
    this.filepath = filepath
  }

  abstract read(): string

  extension() {
    return path.extname(this.filepath)
  }

  filename() {
    return path.basename(this.filepath)
  }

  dir() {
    return path.dirname(this.filepath)
  }
}

export class MemoryArtifact extends Artifact {
  override readonly kind = "memory"
  readonly content: string

  constructor(filepath: string, content: string) {
    super(filepath)
    this.content = content
  }

  override read(): string {
    return this.content
  }
  
}

export class DiskArtifact extends Artifact {
  override readonly kind = "disk"

  constructor(filepath: string, content: string) {
    super(filepath)
    this.write(content) 
  }

  write(content: string) {
    if (!fs.existsSync(this.dir())) {
      fs.mkdirSync(this.dir(), { recursive: true });
    }

    fs.writeFileSync(this.filepath, content, 'utf-8')
  }

  override read(): string {
    return fs.readFileSync(this.filepath, 'utf-8')
  }
}
