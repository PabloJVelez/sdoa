import { 
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse
} from "@medusajs/workflows-sdk"
import { CHEF_EVENT_MODULE } from "../modules/chef-event"

type DeleteChefEventWorkflowInput = {
  id: string
}

const deleteChefEventStep = createStep(
  "delete-chef-event-step",
  async (input: DeleteChefEventWorkflowInput, { container }: { container: any }) => {
    const chefEventModuleService = container.resolve(CHEF_EVENT_MODULE)
    
    const chefEvent = await chefEventModuleService.retrieveChefEvent(input.id)
    
    if (!chefEvent) {
      throw new Error(`Chef event with id ${input.id} not found`)
    }
    
    await chefEventModuleService.deleteChefEvents(input.id)
    
    return new StepResponse({ 
      id: input.id,
      deleted: true 
    })
  }
)

export const deleteChefEventWorkflow = createWorkflow(
  "delete-chef-event-workflow",
  function (input: DeleteChefEventWorkflowInput) {
    const result = deleteChefEventStep(input)
    
    return new WorkflowResponse({
      result
    })
  }
) 