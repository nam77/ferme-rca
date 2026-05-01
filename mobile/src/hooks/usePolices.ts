import { useFonts as useDMSans, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans'
import { Fraunces_400Regular_Italic, Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces'
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono'

export const usePolices = (): boolean => {
  const [chargees] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Fraunces_400Regular_Italic,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  })
  return chargees
}
