namespace CreaturesApi {
    export interface CreatureHeaderQuery {
        moniker: string

        name: string

        genus: string

        gender: string

        birthdate: Date
    }

    export interface CreatureEventQuery {
        moniker: string
        eventNumber: number
        histEventType: number
        lifeStage: number
        photo: string
        moniker1: string
        moniker2: string
        timeUtc: Dates
        tickAge: number
        worldTick: number
        worldName: string
        worldId
    }
}
