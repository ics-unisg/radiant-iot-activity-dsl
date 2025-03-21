import { AdapterConfig } from "../../config/schema.js";
import { Artifact } from "../../generator/artifact.js";
import { Changeset } from "../changeset.js";
import { Adapter } from "../index.js";

export default class SiddhiAdapter implements Adapter {
  readonly name = "Siddhi"
  readonly version = "0.1.0"
  
  config: AdapterConfig

  constructor(config: AdapterConfig) {
    this.config = config
  }

  async deploy(artifacts: Artifact[]): Promise<Changeset> {
    const apps = await this.getApps()

    let changeset = new Changeset()
    artifacts
      .filter(art => !apps.includes(this.getAppName(art)))
      .forEach(art => {
        // TODO: actually verify if request is successful and handle errors
        this.createApp(art)
        changeset.addAddition(this.getAppName(art))
      })
      
    artifacts
      .filter(art => apps.includes(this.getAppName(art)))
      .forEach(art => {
        // TODO: actually verify if request is successful and handle errors
        this.updateApp(art)
        changeset.addUpdate(this.getAppName(art))
      })

    return changeset
  }

  async deployDry(artifacts: Artifact[]): Promise<Changeset> {
    const apps = await this.getApps()

    let changeset = new Changeset()
    const appNames = artifacts
      .map(art => this.getAppName(art))

    appNames
      .filter(name => !apps.includes(name))
      .forEach(name => {
        changeset.addAddition(name)
      })
      
    appNames
      .filter(name => apps.includes(name))
      .forEach(name => {
        changeset.addUpdate(name)
      })
    
    return changeset
  }

  getAppName(art: Artifact) {
    const regex = new RegExp(/@App:name\('([^']+)'\)/i)

    const content = art.read()

    const match = content.match(regex)
    if (!match) {
      throw new Error(`Could not find app name in ${art.filename}`)
    }

    return match[1]
  }

  async getApps() {
    const apps = await this.fetch('/')
      .then(res => res.json())
      .catch(err => {
        throw new Error(`Failed to get apps: ${err}`)
      })


    return apps as string[]
  }

  async createApp(art: Artifact) {
    const res = await this.fetch('/', {
      method: 'POST', 
      body: art.read()
    })

    if (!res.ok) {
      throw new Error(`Failed to create app: ${res.statusText}`)
    }
  }

  async updateApp(art: Artifact) {
    const res = await this.fetch('/', {
      method: 'PUT', 
      body: art.read()
    })

    if (!res.ok) {
      throw new Error(`Failed to update app: ${res.statusText}`)
    }
  }

  /**
   * Helper function to make requests to the Siddhi endpoint.
   *
   * @param path The path to request, relative to the configured endpoint.
   * @param options Request options to use.
   * @returns The response of the request.
   */
  async fetch(path: string, options?: RequestInit) {

    // Ensure the correct amount of slahes
    let base = (this.config.endpoint.endsWith("/")) 
      ? this.config.endpoint.slice(0, -1) 
      : this.config.endpoint
    path = (path.startsWith("/")) 
      ? path 
      : `/${path}`
    const url = base + path

    const req = new Request(url, options)
    
    if (this.config.auth) {
      switch(this.config.auth.type) {
        case 'basic':
        default:
          req.headers.set("Authorization", `Basic ${btoa(`${this.config.auth.username}:${this.config.auth.password}`)}`)
        break
      }
    }

    return fetch(req)
  }
}