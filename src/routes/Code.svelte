<script>
    import Highlight, { LineNumbers } from "svelte-highlight";
    import c from "svelte-highlight/languages/c";
    import darcula from "svelte-highlight/styles/darcula";

    let code = `int main() {
	   char c;
	   int lowercase_vowel, uppercase_vowel;
	   printf("Enter an alphabet: ");
	   scanf("%c", &c);
	 
	   // evaluates to 1 if variable c is a lowercase vowel
	   lowercase_vowel = (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u');
	 
	   // evaluates to 1 if variable c is a uppercase vowel
	   uppercase_vowel = (c == 'A' || c == 'E' || c == 'I' || c == 'O' || c == 'U');
	 
	   // Show error message if c is not an alphabet
	   if (!isalpha(c))
	      printf("Error! Non-alphabetic character.");
	   else if (lowercase_vowel || uppercase_vowel)
	      printf("%c is a vowel.", c);
	   else
	      printf("%c is a consonant.", c);
	 
	   return 0;
	}
`;

    let currentLine = 0;
</script>

<svelte:head>
    {@html darcula}
</svelte:head>

<div class="bg-zinc-800 font-mono leading-7 h-full w-full">
    <Highlight language={c} {code} let:highlighted>
        <LineNumbers
            {highlighted}
            highlightedLines={[currentLine]}
            --highlighted-background="#637963"
        />
    </Highlight>
</div>
