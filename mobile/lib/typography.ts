import { TextStyle } from 'react-native'

/** Tipografía estilo producto: Inter limpia, títulos bold, cuerpo regular gris. */
export const type = {
  display: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    color: '#111111',
  } satisfies TextStyle,
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: '#111111',
  } satisfies TextStyle,
  section: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: '#111111',
  } satisfies TextStyle,
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#5f5f5f',
  } satisfies TextStyle,
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#8a8a8a',
  } satisfies TextStyle,
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
    color: '#4334d6',
  } satisfies TextStyle,
  button: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    lineHeight: 20,
    color: '#ffffff',
  } satisfies TextStyle,
}
