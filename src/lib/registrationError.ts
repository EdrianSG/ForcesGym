export class RegistrationIncompleteError extends Error {
  readonly memberId: string
  constructor(memberId: string) {
    super('El cliente quedó registrado, pero no se pudo confirmar su membresía. Abre su ficha y revisa el historial antes de renovar. No vuelvas a registrarlo.')
    this.memberId = memberId
    this.name = 'RegistrationIncompleteError'
  }
}
