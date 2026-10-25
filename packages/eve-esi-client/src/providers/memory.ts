import {
  type Provider,
  type Account,
  type Character,
  type Token,
} from '../index'

export default class MemoryProvider implements Provider {
  public readonly accounts = new Map<string, Account>()
  public readonly characters = new Map<number, Character>()
  public readonly tokens = new Map<number, Token[]>()

  public async getAccount(owner: string, _onLogin?: boolean) {
    return this.accounts.get(owner) ?? null
  }

  public async getCharacter(characterId: number, _onLogin?: boolean) {
    return this.characters.get(characterId) ?? null
  }

  public async getToken(
    characterId: number,
    scopes?: string | string[] | null,
  ) {
    const tokens = this.tokens.get(characterId)

    if (!tokens) {
      return null
    }

    if (typeof scopes === 'string') {
      scopes = scopes.split(' ')
    }

    for (const token of tokens) {
      if (!scopes || scopes.length === 0) {
        return token
      }

      if (scopes.every(scope => token.scopes?.includes(scope))) {
        return token
      }
    }

    return null
  }

  public async createAccount(owner: string) {
    const account: Account = {
      owner,
      deleteAccount: async () => {
        this.accounts.delete(owner)
      },
      deleteCharacters: async () => {
        for (const [characterId, character] of this.characters) {
          if (character.owner === owner) {
            this.characters.delete(characterId)
          }
        }
      },
    }

    this.accounts.set(owner, account)
    return account
  }

  public async createCharacter(
    owner: string,
    characterId: number,
    characterName: string,
  ) {
    const character: Character = {
      owner,
      characterId,
      characterName,
      updateCharacter: async (nextOwner, nextName) => {
        character.owner = nextOwner
        character.characterName = nextName
      },
      deleteTokens: async () => {
        this.tokens.delete(character.characterId)
      },
      deleteCharacter: async () => {
        this.tokens.delete(character.characterId)
        this.characters.delete(characterId)
      },
    }

    this.characters.set(characterId, character)

    return character
  }

  public async createToken(
    characterId: number,
    accessToken: string,
    refreshToken: string,
    expires: Date,
    scopes?: string | string[] | null,
  ) {
    let scopeList: string[] = []
    if (scopes != null) {
      scopeList =
        typeof scopes === 'string' ? scopes.split(' ') : [...scopes]
    }

    const token: Token = {
      characterId,
      accessToken,
      refreshToken,
      expires,
      scopes: scopeList,
      updateToken: async (nextAccess, nextRefresh, nextExpires, nextScopes) => {
        let updatedScopes = token.scopes ?? []
        if (nextScopes != null) {
          updatedScopes =
            typeof nextScopes === 'string'
              ? nextScopes.split(' ')
              : [...nextScopes]
        }
        token.accessToken = nextAccess
        token.refreshToken = nextRefresh
        token.expires = nextExpires
        token.scopes = updatedScopes
      },
      deleteToken: async () => {
        const list = this.tokens.get(token.characterId)
        if (!list?.length) {
          return
        }
        const index = list.findIndex(t => t.accessToken === accessToken)
        if (index >= 0) {
          list.splice(index, 1)
        }
      },
    }

    const list = this.tokens.get(characterId) ?? []
    list.push(token)
    this.tokens.set(characterId, list)
    return token
  }

  public async deleteAccount(owner: string) {
    this.accounts.delete(owner)
  }

  public async deleteCharacter(characterId: number) {
    this.characters.delete(characterId)
    this.tokens.delete(characterId)
  }

  public async deleteToken(accessToken: string) {
    if (!this.characters.size) {
      return
    }

    for (const character of this.characters.values()) {
      const tokens = this.tokens.get(character.characterId)

      if (!tokens?.length) {
        continue
      }

      for (const token of tokens) {
        if (token.accessToken === accessToken) {
          await token.deleteToken()
          return
        }
      }
    }
  }
}
