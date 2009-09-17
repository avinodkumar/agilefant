package fi.hut.soberit.agilefant.web;

import java.util.ArrayList;
import java.util.Collection;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

import com.opensymphony.xwork2.Action;

import fi.hut.soberit.agilefant.business.StoryBusiness;
import fi.hut.soberit.agilefant.business.StorySplitBusiness;
import fi.hut.soberit.agilefant.model.Story;

@Component("storySplitAction")
@Scope("prototype")
public class StorySplitAction {

    @Autowired
    private StoryBusiness storyBusiness;
    
    @Autowired
    private StorySplitBusiness storySplitBusiness;
    
    private int originalStoryId;
   
    private Collection<Story> newStories = new ArrayList<Story>(); 
    
    
    public String split() {
        Story original = storyBusiness.retrieve(originalStoryId);
        storySplitBusiness.splitStory(original, newStories);
        return Action.SUCCESS;
    }

    /* GETTERS AND SETTERS */
    
    public void setOriginalStoryId(int originalStoryId) {
        this.originalStoryId = originalStoryId;
    }

    public int getOriginalStoryId() {
        return originalStoryId;
    }

    public void setStoryBusiness(StoryBusiness storyBusiness) {
        this.storyBusiness = storyBusiness;
    }

    public void setNewStories(Collection<Story> newStories) {
        this.newStories = newStories;
    }

    public Collection<Story> getNewStories() {
        return newStories;
    }

    public void setStorySplitBusiness(StorySplitBusiness storySplitBusiness) {
        this.storySplitBusiness = storySplitBusiness;
    }

}