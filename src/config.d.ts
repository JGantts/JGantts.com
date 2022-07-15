namespace Config {
    export interface Config {
        environment: string,
        sites: [Site]
    }

    export interface Site {
         name: string,
         uri: string,
         path: string
    }
}
