        // const concatenated = collectedSummaries.join('\n\n');

        // // Enqueue the separator FIRST
        // controller.enqueue(encode(FINAL_SEPARATOR)); 

        // // Fetch the final completion, now streamed again
        // const finalCompletion = await openai.chat.completions.create({
        //   model,
        //   stream: true, // Reverted: This call is streaming again
        //   temperature: 0.3,
        //   messages: [
        //     { role: 'system', content: messages.systemPromptsFinal },
        //     {
        //       role: 'user',
        //       content: `${messages.userPromptsFinal}
        //         respond in language: ${locale}
        //         Collected Summaries:
        //         ${concatenated}`,
        //     },
        //   ],
        // });

        // // Stream the final completion
        // for await (const part of finalCompletion) {
        //   const content = part.choices[0]?.delta?.content;
        //   if (content) {
        //     controller.enqueue(encode(content));
        //   }
        // }

